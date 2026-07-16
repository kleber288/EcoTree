from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, transactions, goals, tree
from config import ALLOWED_ORIGINS
from database import criar_tabelas

app = FastAPI(
    title="EcoTree API",
    description="Backend do aplicativo EcoTree - Jogando o Verde",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def iniciar_banco():
    criar_tabelas()


app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(tree.router)


@app.get("/")
def home():
    return {
        "mensagem": "API EcoTree funcionando!",
        "status": "online",
        "projeto": "Jogando o Verde",
        "banco_de_dados": "SQLite conectado"
    }
