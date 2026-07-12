from fastapi import APIRouter, Depends

from auth import verificar_token
from schemas import TreeAddPoints
from tree_service import (
    buscar_ou_criar_arvore,
    montar_resposta_arvore,
    atualizar_arvore_no_banco,
    recalcular_arvore_usuario
)

router = APIRouter(
    prefix="/tree",
    tags=["Árvore"]
)


@router.get("/")
def home_arvore():
    return {
        "mensagem": "Sistema da árvore EcoTree funcionando",
        "rotas_disponiveis": [
            "GET /tree/me",
            "GET /tree/status",
            "PATCH /tree/add-points",
            "PUT /tree/update",
            "GET /tree/status/{user_id}",
            "PUT /tree/update/{user_id}",
            "PATCH /tree/add-points/{user_id}"
        ]
    }


@router.get("/status")
def status_arvore_logada(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    arvore = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Status da arvore do usuario autenticado",
        "usuario": usuario_logado,
        "arvore": montar_resposta_arvore(arvore)
    }


@router.get("/me")
def minha_arvore(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    arvore = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Status da arvore do usuario autenticado",
        "usuario": usuario_logado,
        "arvore": montar_resposta_arvore(arvore)
    }


@router.get("/status/{user_id}")
def status_arvore(user_id: int):
    arvore = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Status da árvore encontrado",
        "arvore": montar_resposta_arvore(arvore)
    }


@router.patch("/add-points/{user_id}")
def adicionar_pontos_arvore(user_id: int, dados: TreeAddPoints):
    arvore = buscar_ou_criar_arvore(user_id)

    novos_pontos = arvore["pontos"] + dados.pontos

    atualizar_arvore_no_banco(user_id, novos_pontos)

    arvore_atualizada = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Pontos adicionados com sucesso!",
        "motivo": dados.motivo,
        "pontos_adicionados": dados.pontos,
        "arvore": montar_resposta_arvore(arvore_atualizada)
    }


@router.patch("/add-points")
def adicionar_pontos_arvore_logada(
    dados: TreeAddPoints,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]
    arvore = buscar_ou_criar_arvore(user_id)

    novos_pontos = arvore["pontos"] + dados.pontos

    atualizar_arvore_no_banco(user_id, novos_pontos)

    arvore_atualizada = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Pontos adicionados com sucesso!",
        "motivo": dados.motivo,
        "pontos_adicionados": dados.pontos,
        "arvore": montar_resposta_arvore(arvore_atualizada)
    }


@router.put("/update/{user_id}")
def recalcular_arvore(user_id: int):
    resultado = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Árvore recalculada com sucesso!",
        "calculo": resultado["calculo"],
        "arvore": resultado["arvore"]
    }


@router.put("/update")
def recalcular_arvore_logada(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    resultado = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Arvore recalculada com sucesso!",
        "calculo": resultado["calculo"],
        "arvore": resultado["arvore"]
    }
