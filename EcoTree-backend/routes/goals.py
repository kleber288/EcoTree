from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError

from auth import verificar_token
from database import (
    executar_select_um,
    goals_table,
    transacao,
    valor_monetario,
)
from schemas import GoalCreateAuthenticated, GoalProgress, GoalUpdate
from tree_service import recalcular_arvore_usuario, verificar_usuario_existe

router = APIRouter(
    prefix="/goals",
    tags=["Metas"]
)


def buscar_meta_por_id(goal_id: int):
    meta = executar_select_um(
        select(
            goals_table.c.id,
            goals_table.c.user_id,
            goals_table.c.titulo,
            goals_table.c.valor_meta,
            goals_table.c.valor_atual,
            goals_table.c.prazo,
            goals_table.c.status,
        ).where(goals_table.c.id == goal_id)
    )

    if meta is None:
        raise HTTPException(
            status_code=404,
            detail="Meta não encontrada."
        )

    return meta


def _decimal(value):
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def verificar_meta_pertence_ao_usuario(meta, user_id: int):
    if meta["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para acessar esta meta."
        )


def calcular_status(valor_atual, valor_meta):
    if _decimal(valor_atual) >= _decimal(valor_meta):
        return "concluída"
    return "em andamento"


def montar_meta(meta):
    valor_meta = _decimal(meta["valor_meta"] or 0)
    valor_atual = _decimal(meta["valor_atual"] or 0)
    progresso_percentual = 0

    if valor_meta > 0:
        progresso_percentual = (valor_atual / valor_meta) * 100

    valor_restante = max(valor_meta - valor_atual, 0)

    return {
        "id": meta["id"],
        "user_id": meta["user_id"],
        "titulo": meta["titulo"],
        "valor_meta": valor_monetario(valor_meta),
        "valor_atual": valor_monetario(valor_atual),
        "valor_restante": valor_monetario(valor_restante),
        "progresso_percentual": round(float(progresso_percentual), 2),
        "prazo": meta["prazo"],
        "status": meta["status"]
    }


def listar_metas_por_usuario(user_id: int):
    with transacao() as conn:
        verificar_usuario_existe(user_id, conn=conn)

        metas = conn.execute(
            select(
                goals_table.c.id,
                goals_table.c.user_id,
                goals_table.c.titulo,
                goals_table.c.valor_meta,
                goals_table.c.valor_atual,
                goals_table.c.prazo,
                goals_table.c.status,
            )
            .where(goals_table.c.user_id == user_id)
            .order_by(goals_table.c.id.desc())
        ).mappings().all()

    lista_metas = [montar_meta(meta) for meta in metas]

    return {
        "mensagem": "Metas do usuário",
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
    valor_meta = _decimal(meta.valor_meta)
    valor_atual = _decimal(meta.valor_atual)
    status_meta = calcular_status(valor_atual, valor_meta)

    try:
        with transacao() as conn:
            verificar_usuario_existe(user_id, conn=conn)

            result = conn.execute(
                insert(goals_table).values(
                    user_id=user_id,
                    titulo=meta.titulo,
                    valor_meta=valor_meta,
                    valor_atual=valor_atual,
                    prazo=meta.prazo,
                    status=status_meta,
                )
            )

            goal_id = result.inserted_primary_key[0]

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao criar meta."
        )

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
            detail="Você não tem permissão para acessar estas metas."
        )

    return listar_metas_por_usuario(user_id)


@router.get("/{goal_id}")
def buscar_meta(
    goal_id: int,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    meta = buscar_meta_por_id(goal_id)
    verificar_meta_pertence_ao_usuario(meta, user_id)

    return {
        "mensagem": "Meta encontrada.",
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

    titulo = (
        dados_atualizados.titulo
        if dados_atualizados.titulo is not None
        else meta_atual["titulo"]
    )
    valor_meta = _decimal(
        dados_atualizados.valor_meta
        if dados_atualizados.valor_meta is not None
        else meta_atual["valor_meta"]
    )
    valor_atual = _decimal(
        dados_atualizados.valor_atual
        if dados_atualizados.valor_atual is not None
        else meta_atual["valor_atual"]
    )
    prazo = (
        dados_atualizados.prazo
        if dados_atualizados.prazo is not None
        else meta_atual["prazo"]
    )

    if dados_atualizados.status is not None:
        status_meta = dados_atualizados.status
    else:
        status_meta = calcular_status(valor_atual, valor_meta)

    try:
        with transacao() as conn:
            conn.execute(
                update(goals_table)
                .where(goals_table.c.id == goal_id)
                .values(
                    titulo=titulo,
                    valor_meta=valor_meta,
                    valor_atual=valor_atual,
                    prazo=prazo,
                    status=status_meta,
                )
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar meta."
        )

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

    novo_valor_atual = (
        _decimal(meta_atual["valor_atual"])
        + _decimal(progresso.valor_adicionado)
    )
    novo_status = calcular_status(novo_valor_atual, meta_atual["valor_meta"])

    try:
        with transacao() as conn:
            conn.execute(
                update(goals_table)
                .where(goals_table.c.id == goal_id)
                .values(
                    valor_atual=novo_valor_atual,
                    status=novo_status,
                )
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao adicionar progresso na meta."
        )

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

    try:
        with transacao() as conn:
            conn.execute(
                delete(goals_table).where(goals_table.c.id == goal_id)
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao deletar meta."
        )

    resultado_arvore = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Meta deletada com sucesso!",
        "goal_id": goal_id,
        "arvore_atualizada": resultado_arvore["arvore"]
    }
