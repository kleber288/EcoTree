from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routes import users, transactions, goals, tree
from config import ALLOWED_ORIGINS
from database import criar_tabelas, descricao_banco_segura, verificar_conexao_banco

app = FastAPI(
    title="EcoTree API",
    description="Backend do aplicativo EcoTree - Jogando o Verde",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def iniciar_banco():
    criar_tabelas()


app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(tree.router)


def _resposta_status_banco():
    conectado = verificar_conexao_banco()
    return conectado, "connected" if conectado else "disconnected"


@app.get("/health")
def health():
    conectado, status_banco = _resposta_status_banco()
    payload = {
        "status": "ok" if conectado else "error",
        "database": status_banco
    }

    if not conectado:
        return JSONResponse(status_code=503, content=payload)

    return payload


@app.get("/")
def home():
    conectado, status_banco = _resposta_status_banco()
    payload = {
        "mensagem": "API EcoTree funcionando!",
        "status": "online" if conectado else "degraded",
        "projeto": "Jogando o Verde",
        "banco_de_dados": f"{descricao_banco_segura()} {status_banco}"
    }

    if not conectado:
        return JSONResponse(status_code=503, content=payload)

    return payload
