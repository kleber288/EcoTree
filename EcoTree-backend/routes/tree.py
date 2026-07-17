from fastapi import APIRouter, Depends

from auth import verificar_token
from schemas import TreeAddPoints
from tree_service import (
    buscar_ou_criar_arvore,
    montar_resposta_arvore,
    adicionar_pontos_manuais_arvore,
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
            "PUT /tree/update"
        ]
    }


@router.get("/status")
def status_arvore_logada(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    arvore = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Status da árvore do usuário autenticado",
        "usuario": usuario_logado,
        "arvore": montar_resposta_arvore(arvore)
    }


@router.get("/me")
def minha_arvore(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    arvore = buscar_ou_criar_arvore(user_id)

    return {
        "mensagem": "Status da árvore do usuário autenticado",
        "usuario": usuario_logado,
        "arvore": montar_resposta_arvore(arvore)
    }


@router.patch("/add-points")
def adicionar_pontos_arvore_logada(
    dados: TreeAddPoints,
    usuario_logado: dict = Depends(verificar_token)
):
    user_id = usuario_logado["user_id"]

    arvore_atualizada = adicionar_pontos_manuais_arvore(user_id, dados.pontos)

    return {
        "mensagem": "Pontos adicionados com sucesso!",
        "motivo": dados.motivo,
        "pontos_adicionados": dados.pontos,
        "arvore": montar_resposta_arvore(arvore_atualizada)
    }


@router.put("/update")
def recalcular_arvore_logada(usuario_logado: dict = Depends(verificar_token)):
    user_id = usuario_logado["user_id"]
    resultado = recalcular_arvore_usuario(user_id)

    return {
        "mensagem": "Árvore recalculada com sucesso!",
        "calculo": resultado["calculo"],
        "arvore": resultado["arvore"]
    }
