from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, insert, select
from sqlalchemy.exc import SQLAlchemyError

from auth import verificar_token
from database import (
    executar_select_um,
    timestamp_para_api,
    transactions_table,
    transacao,
    valor_monetario,
)
from schemas import TransactionCreateAuthenticated
from tree_service import recalcular_arvore_usuario, verificar_usuario_existe

router = APIRouter(
    prefix="/transactions",
    tags=["Transações"]
)


def _montar_transacao(transacao):
    return {
        "id": transacao["id"],
        "user_id": transacao["user_id"],
        "tipo": transacao["tipo"],
        "categoria": transacao["categoria"],
        "valor": valor_monetario(transacao["valor"]),
        "descricao": transacao["descricao"],
        "created_at": timestamp_para_api(transacao["created_at"])
    }


def listar_transacoes_por_usuario(user_id: int):
    with transacao() as conn:
        verificar_usuario_existe(user_id, conn=conn)

        rows = conn.execute(
            select(
                transactions_table.c.id,
                transactions_table.c.user_id,
                transactions_table.c.tipo,
                transactions_table.c.categoria,
                transactions_table.c.valor,
                transactions_table.c.descricao,
                transactions_table.c.created_at,
            )
            .where(transactions_table.c.user_id == user_id)
            .order_by(transactions_table.c.created_at.desc())
        ).mappings().all()

    lista_transacoes = [_montar_transacao(transacao) for transacao in rows]

    return {
        "mensagem": "Transações do usuário",
        "user_id": user_id,
        "total": len(lista_transacoes),
        "transacoes": lista_transacoes
    }


def _scalar_number(conn, statement):
    value = conn.execute(statement).scalar_one()
    return value or 0


def resumo_transacoes_por_usuario(user_id: int):
    with transacao() as conn:
        verificar_usuario_existe(user_id, conn=conn)

        total_ganhos = _scalar_number(
            conn,
            select(func.coalesce(func.sum(transactions_table.c.valor), 0)).where(
                transactions_table.c.user_id == user_id,
                transactions_table.c.tipo == "ganho",
            ),
        )

        total_gastos = _scalar_number(
            conn,
            select(func.coalesce(func.sum(transactions_table.c.valor), 0)).where(
                transactions_table.c.user_id == user_id,
                transactions_table.c.tipo == "gasto",
            ),
        )

        total_transacoes = _scalar_number(
            conn,
            select(func.count()).select_from(transactions_table).where(
                transactions_table.c.user_id == user_id
            ),
        )

    saldo = total_ganhos - total_gastos

    return {
        "mensagem": "Resumo financeiro do usuário",
        "user_id": user_id,
        "total_ganhos": valor_monetario(total_ganhos),
        "total_gastos": valor_monetario(total_gastos),
        "saldo": valor_monetario(saldo),
        "total_transacoes": int(total_transacoes)
    }


def buscar_transacao_por_id(transacao_id: int):
    transacao = executar_select_um(
        select(
            transactions_table.c.id,
            transactions_table.c.user_id,
        ).where(transactions_table.c.id == transacao_id)
    )

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
    transacao_dados: TransactionCreateAuthenticated,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]

    try:
        with transacao() as conn:
            verificar_usuario_existe(user_id, conn=conn)

            result = conn.execute(
                insert(transactions_table).values(
                    user_id=user_id,
                    tipo=transacao_dados.tipo,
                    categoria=transacao_dados.categoria,
                    valor=transacao_dados.valor,
                    descricao=transacao_dados.descricao,
                )
            )

            transacao_id = result.inserted_primary_key[0]

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao criar transação."
        )

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Transação cadastrada com sucesso!",
        "transacao": {
            "id": transacao_id,
            "user_id": user_id,
            "tipo": transacao_dados.tipo,
            "categoria": transacao_dados.categoria,
            "valor": transacao_dados.valor,
            "descricao": transacao_dados.descricao
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
    transacao_encontrada = buscar_transacao_por_id(transacao_id)
    verificar_transacao_pertence_ao_usuario(
        transacao_encontrada,
        user_id,
        "deletar"
    )

    try:
        with transacao() as conn:
            conn.execute(
                delete(transactions_table).where(
                    transactions_table.c.id == transacao_id
                )
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao deletar transação."
        )

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Transação deletada com sucesso!",
        "transacao_id": transacao_id,
        "arvore_atualizada": resultado_arvore["arvore"]
    }
