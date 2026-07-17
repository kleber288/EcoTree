import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False


BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

LOCAL_FRONTEND_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
)


def _split_csv(value):
    if not value:
        return []

    return [item.strip() for item in value.split(",") if item.strip()]


def _get_int_env(name, default):
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _resolve_database_file(value):
    if not value:
        return str(BASE_DIR / "ecotree.db")

    path = Path(value)

    if path.is_absolute():
        return str(path)

    return str(BASE_DIR / path)


ENVIRONMENT = os.getenv("ECOTREE_ENV", "development").strip().lower()
SECRET_KEY = os.getenv("ECOTREE_SECRET_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not SECRET_KEY:
    if ENVIRONMENT in ("production", "prod"):
        raise RuntimeError(
            "ECOTREE_SECRET_KEY precisa ser configurada em producao."
        )

    SECRET_KEY = "ecotree-chave-secreta-temporaria"

ACCESS_TOKEN_EXPIRE_MINUTES = _get_int_env(
    "ECOTREE_ACCESS_TOKEN_EXPIRE_MINUTES",
    60
)
DATABASE_FILE = _resolve_database_file(os.getenv("ECOTREE_DATABASE_FILE"))
ALLOWED_ORIGINS = list(dict.fromkeys([
    *LOCAL_FRONTEND_ORIGINS,
    *_split_csv(os.getenv("ECOTREE_FRONTEND_ORIGINS"))
]))
