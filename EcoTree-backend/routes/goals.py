import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from auth import verificar_token
from database import conectar
from schemas import GoalCreateAuthenticated, GoalUpdate, GoalProgress
from tree_service import recalcular_arvore_usuario

router = APIRouter(
    prefix="/goals",
    tags=["Metas"]
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


def buscar_meta_por_id(goal_id: int):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, titulo, valor_meta, valor_atual, prazo, status
        FROM goals
        WHERE id = ?
    """, (goal_id,))

    meta = cursor.fetchone()
    conn.close()

    if meta is None:
        raise HTTPException(
            status_code=404,
            detail="Meta não encontrada."
        )

    return meta


def verificar_meta_pertence_ao_usuario(meta, user_id: int):
    if meta["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Voce nao tem permissao para acessar esta meta."
        )


def calcular_status(valor_atual: float, valor_meta: float):
    if valor_atual >= valor_meta:
        return "concluída"
    return "em andamento"


def montar_meta(meta):
    progresso_percentual = 0

    if meta["valor_meta"] > 0:
        progresso_percentual = (meta["valor_atual"] / meta["valor_meta"]) * 100

    return {
        "id": meta["id"],
        "user_id": meta["user_id"],
        "titulo": meta["titulo"],
        "valor_meta": meta["valor_meta"],
        "valor_atual": meta["valor_atual"],
        "valor_restante": max(meta["valor_meta"] - meta["valor_atual"], 0),
        "progresso_percentual": round(progresso_percentual, 2),
        "prazo": meta["prazo"],
        "status": meta["status"]
    }


def listar_metas_por_usuario(user_id: int):
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, titulo, valor_meta, valor_atual, prazo, status
        FROM goals
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user_id,))

    metas = cursor.fetchall()
    conn.close()

    lista_metas = []

    for meta in metas:
        lista_metas.append(montar_meta(meta))

    return {
        "mensagem": "Metas do usuario",
        "user_id": user_id,
        "total": len(lista_metas),
        "metas": lista_metas
    }


@router.get("/")
def listar_metas_logado(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    return listar_metas_por_usuario(user_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
def criar_meta(
    meta: GoalCreateAuthenticated,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    verificar_usuario_existe(user_id)

    status_meta = calcular_status(meta.valor_atual, meta.valor_meta)

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO goals (
                user_id,
                titulo,
                valor_meta,
                valor_atual,
                prazo,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            meta.titulo,
            meta.valor_meta,
            meta.valor_atual,
            meta.prazo,
            status_meta
        ))

        goal_id = cursor.lastrowid
        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar meta: {erro}"
        )

    finally:
        conn.close()

    meta_criada = buscar_meta_por_id(goal_id)
    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Meta cadastrada com sucesso!",
        "meta": montar_meta(meta_criada),
        "arvore_atualizada": resultado_arvore["arvore"]
    }


@router.get("/user")
def listar_metas_usuario_logado(
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    return listar_metas_por_usuario(user_id)


@router.get("/user/{user_id}")
def listar_metas_usuario(
    user_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id_logado = usuario_logado["user_id"]

    if user_id != user_id_logado:
        raise HTTPException(
            status_code=403,
            detail="Voce nao tem permissao para acessar esta meta."
        )

    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, titulo, valor_meta, valor_atual, prazo, status
        FROM goals
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user_id,))

    metas = cursor.fetchall()
    conn.close()

    lista_metas = []

    for meta in metas:
        lista_metas.append(montar_meta(meta))

    return {
        "mensagem": "Metas do usuário",
        "user_id": user_id,
        "total": len(lista_metas),
        "metas": lista_metas
    }


@router.get("/{goal_id}")
def buscar_meta(
    goal_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    meta = buscar_meta_por_id(goal_id)
    verificar_meta_pertence_ao_usuario(meta, user_id)

    return {
        "mensagem": "Meta encontrada",
        "meta": montar_meta(meta)
    }


@router.put("/{goal_id}")
def atualizar_meta(
    goal_id: int,
    dados_atualizados: GoalUpdate,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    meta_atual = buscar_meta_por_id(goal_id)
    verificar_meta_pertence_ao_usuario(meta_atual, user_id)

    titulo = dados_atualizados.titulo if dados_atualizados.titulo is not None else meta_atual["titulo"]
    valor_meta = dados_atualizados.valor_meta if dados_atualizados.valor_meta is not None else meta_atual["valor_meta"]
    valor_atual = dados_atualizados.valor_atual if dados_atualizados.valor_atual is not None else meta_atual["valor_atual"]
    prazo = dados_atualizados.prazo if dados_atualizados.prazo is not None else meta_atual["prazo"]

    if dados_atualizados.status is not None:
        status_meta = dados_atualizados.status
    else:
        status_meta = calcular_status(valor_atual, valor_meta)

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE goals
            SET titulo = ?, valor_meta = ?, valor_atual = ?, prazo = ?, status = ?
            WHERE id = ?
        """, (
            titulo,
            valor_meta,
            valor_atual,
            prazo,
            status_meta,
            goal_id
        ))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao atualizar meta: {erro}"
        )

    finally:
        conn.close()

    meta_atualizada = buscar_meta_por_id(goal_id)
    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Meta atualizada com sucesso!",
        "meta": montar_meta(meta_atualizada),
        "arvore_atualizada": resultado_arvore["arvore"]
    }


@router.patch("/{goal_id}/progress")
def adicionar_progresso_meta(
    goal_id: int,
    progresso: GoalProgress,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    meta_atual = buscar_meta_por_id(goal_id)
    verificar_meta_pertence_ao_usuario(meta_atual, user_id)

    novo_valor_atual = meta_atual["valor_atual"] + progresso.valor_adicionado
    novo_status = calcular_status(novo_valor_atual, meta_atual["valor_meta"])

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE goals
            SET valor_atual = ?, status = ?
            WHERE id = ?
        """, (
            novo_valor_atual,
            novo_status,
            goal_id
        ))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao adicionar progresso na meta: {erro}"
        )

    finally:
        conn.close()

    meta_atualizada = buscar_meta_por_id(goal_id)
    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Progresso adicionado com sucesso!",
        "meta": montar_meta(meta_atualizada),
        "arvore_atualizada": resultado_arvore["arvore"]
    }


@router.delete("/{goal_id}")
def deletar_meta(
    goal_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    meta = buscar_meta_por_id(goal_id)
    verificar_meta_pertence_ao_usuario(meta, user_id)

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM goals
            WHERE id = ?
        """, (goal_id,))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao deletar meta: {erro}"
        )

    finally:
        conn.close()

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Meta deletada com sucesso!",
        "goal_id": goal_id,
        "arvore_atualizada": resultado_arvore["arvore"]
    }
