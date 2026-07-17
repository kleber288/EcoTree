from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from database import (
    executar_select_todos,
    executar_select_um,
    timestamp_para_api,
    transacao,
    tree_status_table,
    users_table,
)
from schemas import UserCreate, UserLogin
from auth import criar_token, gerar_hash_senha, verificar_senha, verificar_token

router = APIRouter(
    prefix="/users",
    tags=["Usuários"]
)


def _normalizar_email(email: str) -> str:
    return email.strip().lower()


@router.get("/")
def listar_usuarios(usuario_logado: dict = Depends(verificar_token)):
    # Futuramente, restringir esta listagem para usuarios administradores.
    usuarios = executar_select_todos(
        select(
            users_table.c.id,
            users_table.c.nome,
            users_table.c.email,
            users_table.c.created_at,
        )
    )

    lista_usuarios = []

    for usuario in usuarios:
        lista_usuarios.append({
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "created_at": timestamp_para_api(usuario["created_at"])
        })

    return {
        "mensagem": "Usuários cadastrados",
        "usuarios": lista_usuarios
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(usuario: UserCreate):
    email = _normalizar_email(usuario.email)

    email_existente = executar_select_um(
        select(users_table.c.id).where(users_table.c.email == email)
    )

    if email_existente:
        raise HTTPException(
            status_code=400,
            detail="Este email já está cadastrado."
        )

    senha_hash = gerar_hash_senha(usuario.senha)

    try:
        with transacao() as conn:
            result = conn.execute(
                insert(users_table).values(
                    nome=usuario.nome,
                    email=email,
                    senha=senha_hash,
                )
            )

            user_id = result.inserted_primary_key[0]
            conn.execute(insert(tree_status_table).values(user_id=user_id))

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Este email já está cadastrado."
        )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao cadastrar usuário."
        )

    return {
        "mensagem": "Usuário cadastrado com sucesso!",
        "usuario": {
            "id": user_id,
            "nome": usuario.nome,
            "email": email
        },
        "arvore": {
            "nivel": 1,
            "nome_nivel": "Semente",
            "pontos": 0
        }
    }


@router.post("/login")
def login_usuario(dados_login: UserLogin):
    email = _normalizar_email(dados_login.email)

    usuario = executar_select_um(
        select(
            users_table.c.id,
            users_table.c.nome,
            users_table.c.email,
            users_table.c.senha,
            users_table.c.created_at,
        ).where(users_table.c.email == email)
    )

    if usuario is None:
        raise HTTPException(
            status_code=401,
            detail="Email ou senha incorretos."
        )

    senha_correta = verificar_senha(
        dados_login.senha,
        usuario["senha"]
    )

    if not senha_correta:
        raise HTTPException(
            status_code=401,
            detail="Email ou senha incorretos."
        )

    access_token = criar_token({
        "user_id": usuario["id"],
        "email": usuario["email"]
    })

    return {
        "mensagem": "Login realizado com sucesso!",
        "usuario": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "created_at": timestamp_para_api(usuario["created_at"])
        },
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me")
def meu_perfil(usuario_logado: dict = Depends(verificar_token)):
    return {
        "mensagem": "Usuário autenticado",
        "usuario": usuario_logado
    }
