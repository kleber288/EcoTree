from fastapi import FastAPI
from routes import users, transactions, goals, tree
from database import criar_tabelas

app = FastAPI(
    title="EcoTree API",
    description="Backend do aplicativo EcoTree - Jogando o Verde",
    version="1.0.0"
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