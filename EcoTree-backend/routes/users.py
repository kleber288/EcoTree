import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status

from database import conectar
from schemas import UserCreate, UserLogin
from auth import criar_token, gerar_hash_senha, verificar_senha, verificar_token

router = APIRouter(
    prefix="/users",
    tags=["Usuários"]
)


@router.get("/")
def listar_usuarios():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, email, created_at 
        FROM users
    """)

    usuarios = cursor.fetchall()
    conn.close()

    lista_usuarios = []

    for usuario in usuarios:
        lista_usuarios.append({
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "created_at": usuario["created_at"]
        })

    return {
        "mensagem": "Usuários cadastrados",
        "usuarios": lista_usuarios
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(usuario: UserCreate):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id 
        FROM users 
        WHERE email = ?
    """, (usuario.email,))

    email_existente = cursor.fetchone()

    if email_existente:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Este email já está cadastrado."
        )

    senha_hash = gerar_hash_senha(usuario.senha)

    try:
        cursor.execute("""
            INSERT INTO users (nome, email, senha)
            VALUES (?, ?, ?)
        """, (usuario.nome, usuario.email, senha_hash))

        user_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO tree_status (user_id, pontos, nivel, nome_nivel)
            VALUES (?, ?, ?, ?)
        """, (user_id, 0, 1, "Semente"))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao cadastrar usuário: {erro}"
        )

    finally:
        conn.close()

    return {
        "mensagem": "Usuário cadastrado com sucesso!",
        "usuario": {
            "id": user_id,
            "nome": usuario.nome,
            "email": usuario.email
        },
        "arvore": {
            "nivel": 1,
            "nome_nivel": "Semente",
            "pontos": 0
        }
    }


@router.post("/login")
def login_usuario(dados_login: UserLogin):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, email, senha, created_at
        FROM users
        WHERE email = ?
    """, (dados_login.email,))

    usuario = cursor.fetchone()
    conn.close()

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
            "created_at": usuario["created_at"]
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
