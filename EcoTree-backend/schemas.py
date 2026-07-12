from typing import Optional, Literal
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    nome: str = Field(..., min_length=3)
    email: str = Field(..., min_length=5)
    senha: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5)
    senha: str = Field(..., min_length=6)


class TransactionCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    tipo: Literal["ganho", "gasto"]
    categoria: str = Field(..., min_length=2)
    valor: float = Field(..., gt=0)
    descricao: Optional[str] = None


class TransactionCreateAuthenticated(BaseModel):
    tipo: Literal["ganho", "gasto"]
    categoria: str = Field(..., min_length=2)
    valor: float = Field(..., gt=0)
    descricao: Optional[str] = None


class GoalCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    titulo: str = Field(..., min_length=3)
    valor_meta: float = Field(..., gt=0)
    valor_atual: float = Field(default=0, ge=0)
    prazo: Optional[str] = None


class GoalCreateAuthenticated(BaseModel):
    titulo: str = Field(..., min_length=3)
    valor_meta: float = Field(..., gt=0)
    valor_atual: float = Field(default=0, ge=0)
    prazo: Optional[str] = None


class GoalUpdate(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=3)
    valor_meta: Optional[float] = Field(default=None, gt=0)
    valor_atual: Optional[float] = Field(default=None, ge=0)
    prazo: Optional[str] = None
    status: Optional[Literal["em andamento", "concluída"]] = None


class GoalProgress(BaseModel):
    valor_adicionado: float = Field(..., gt=0)


class TreeAddPoints(BaseModel):
    pontos: int = Field(..., gt=0)
    motivo: Optional[str] = None
