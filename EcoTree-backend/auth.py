from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash

from config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY

ALGORITHM = "HS256"

password_hash = PasswordHash.recommended()
security = HTTPBearer(auto_error=False)


def gerar_hash_senha(senha: str) -> str:
    return password_hash.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return password_hash.verify(senha, senha_hash)


def criar_token(dados: dict):
    dados_token = dados.copy()
    expiracao = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    dados_token.update({"exp": expiracao})

    return jwt.encode(dados_token, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token(
    credenciais: HTTPAuthorizationCredentials = Depends(security)
):
    if credenciais is None:
        raise HTTPException(
            status_code=401,
            detail="Token não enviado."
        )

    if credenciais.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Formato do token inválido."
        )

    token = credenciais.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("user_id")
        email = payload.get("email")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Token inválido."
            )

        return {
            "user_id": user_id,
            "email": email
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido ou expirado."
        )
