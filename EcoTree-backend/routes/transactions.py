import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from auth import verificar_token
from database import conectar
from schemas import TransactionCreateAuthenticated
from tree_service import recalcular_arvore_usuario

router = APIRouter(
    prefix="/transactions",
    tags=["Transações"]
)


def verificar_usuario_existe(user_id: int):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, email
        FROM users
        WHERE id = ?
    """, (user_id,))

    usuario = cursor.fetchone()
    conn.close()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado."
        )

    return usuario


def listar_transacoes_por_usuario(user_id: int):
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, tipo, categoria, valor, descricao, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    transacoes = cursor.fetchall()
    conn.close()

    lista_transacoes = []

    for transacao in transacoes:
        lista_transacoes.append({
            "id": transacao["id"],
            "user_id": transacao["user_id"],
            "tipo": transacao["tipo"],
            "categoria": transacao["categoria"],
            "valor": transacao["valor"],
            "descricao": transacao["descricao"],
            "created_at": transacao["created_at"]
        })

    return {
        "mensagem": "Transações do usuário",
        "user_id": user_id,
        "total": len(lista_transacoes),
        "transacoes": lista_transacoes
    }


def resumo_transacoes_por_usuario(user_id: int):
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COALESCE(SUM(valor), 0) AS total_ganhos
        FROM transactions
        WHERE user_id = ? AND tipo = 'ganho'
    """, (user_id,))

    total_ganhos = cursor.fetchone()["total_ganhos"]

    cursor.execute("""
        SELECT COALESCE(SUM(valor), 0) AS total_gastos
        FROM transactions
        WHERE user_id = ? AND tipo = 'gasto'
    """, (user_id,))

    total_gastos = cursor.fetchone()["total_gastos"]

    cursor.execute("""
        SELECT COUNT(*) AS total_transacoes
        FROM transactions
        WHERE user_id = ?
    """, (user_id,))

    total_transacoes = cursor.fetchone()["total_transacoes"]

    conn.close()

    saldo = total_ganhos - total_gastos

    return {
        "mensagem": "Resumo financeiro do usuário",
        "user_id": user_id,
        "total_ganhos": total_ganhos,
        "total_gastos": total_gastos,
        "saldo": saldo,
        "total_transacoes": total_transacoes
    }


def buscar_transacao_por_id(transacao_id: int):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id
        FROM transactions
        WHERE id = ?
    """, (transacao_id,))

    transacao = cursor.fetchone()
    conn.close()

    if transacao is None:
        raise HTTPException(
            status_code=404,
            detail="Transação não encontrada."
        )

    return transacao


def verificar_transacao_pertence_ao_usuario(
    transacao,
    user_id: int,
    acao: str = "acessar"
):
    if transacao["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Você não tem permissão para {acao} esta transação."
        )


@router.get("/")
def listar_transacoes_logado(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    return listar_transacoes_por_usuario(user_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
def criar_transacao(
    transacao: TransactionCreateAuthenticated,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO transactions (
                user_id,
                tipo,
                categoria,
                valor,
                descricao
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id,
            transacao.tipo,
            transacao.categoria,
            transacao.valor,
            transacao.descricao
        ))

        transacao_id = cursor.lastrowid
        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar transação: {erro}"
        )

    finally:
        conn.close()

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Transação cadastrada com sucesso!",
        "transacao": {
            "id": transacao_id,
            "user_id": user_id,
            "tipo": transacao.tipo,
            "categoria": transacao.categoria,
            "valor": transacao.valor,
            "descricao": transacao.descricao
        },
        "arvore_atualizada": resultado_arvore["arvore"]
    }


@router.get("/user")
def listar_transacoes_usuario_logado(
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    return listar_transacoes_por_usuario(user_id)


@router.get("/user/{user_id}")
def listar_transacoes_usuario(
    user_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id_logado = usuario_logado["user_id"]

    if user_id != user_id_logado:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para acessar estas transações."
        )

    return listar_transacoes_por_usuario(user_id)


@router.get("/summary")
def resumo_transacoes_usuario_logado(
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    return resumo_transacoes_por_usuario(user_id)


@router.get("/summary/{user_id}")
def resumo_transacoes(
    user_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id_logado = usuario_logado["user_id"]

    if user_id != user_id_logado:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para acessar este resumo."
        )

    return resumo_transacoes_por_usuario(user_id)


@router.delete("/{transacao_id}")
def deletar_transacao(
    transacao_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    transacao = buscar_transacao_por_id(transacao_id)
    verificar_transacao_pertence_ao_usuario(transacao, user_id, "deletar")

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM transactions
            WHERE id = ?
        """, (transacao_id,))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao deletar transação: {erro}"
        )

    finally:
        conn.close()

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Transação deletada com sucesso!",
        "transacao_id": transacao_id,
        "arvore_atualizada": resultado_arvore["arvore"]
    }
