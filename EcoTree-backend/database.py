from contextlib import contextmanager
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Numeric,
    DateTime,
    Table,
    Text,
    create_engine,
    event,
    func,
    insert,
    inspect,
    select,
    text,
    update,
)
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import SQLAlchemyError

import config


MIGRATION_SPLIT_TREE_POINTS = "20260716_split_tree_points"
MIGRATION_SUPABASE_RLS_SECURITY = "20260717_secure_supabase_public_tables"

APPLICATION_TABLE_NAMES = (
    "users",
    "transactions",
    "goals",
    "tree_status",
    "schema_migrations",
)

SUPABASE_DATA_API_ROLES = (
    "anon",
    "authenticated",
)

DATABASE_URL = config.DATABASE_URL
DATABASE_FILE = config.DATABASE_FILE
ENVIRONMENT = config.ENVIRONMENT

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("nome", Text, nullable=False),
    Column("email", Text, nullable=False, unique=True),
    Column("senha", Text, nullable=False),
    Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP")),
    sqlite_autoincrement=True,
)

transactions_table = Table(
    "transactions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("tipo", Text, nullable=False),
    Column("categoria", Text, nullable=False),
    Column("valor", Numeric(12, 2), nullable=False),
    Column("descricao", Text),
    Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP")),
    sqlite_autoincrement=True,
)

goals_table = Table(
    "goals",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("titulo", Text, nullable=False),
    Column("valor_meta", Numeric(12, 2), nullable=False),
    Column("valor_atual", Numeric(12, 2), server_default=text("0")),
    Column("prazo", Text),
    Column("status", Text, server_default=text("'em andamento'")),
    sqlite_autoincrement=True,
)

tree_status_table = Table(
    "tree_status",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("pontos", Integer, server_default=text("0")),
    Column("pontos_manuais", Integer, nullable=False, server_default=text("0")),
    Column("pontos_automaticos", Integer, nullable=False, server_default=text("0")),
    Column("nivel", Integer, server_default=text("1")),
    Column("nome_nivel", Text, server_default=text("'Semente'")),
    sqlite_autoincrement=True,
)

schema_migrations_table = Table(
    "schema_migrations",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("nome", Text, nullable=False, unique=True),
    Column("executada_em", DateTime, server_default=text("CURRENT_TIMESTAMP")),
    sqlite_autoincrement=True,
)

Index("ix_transactions_user_id", transactions_table.c.user_id)
Index(
    "ix_transactions_user_created_at",
    transactions_table.c.user_id,
    transactions_table.c.created_at,
)
Index("ix_goals_user_id", goals_table.c.user_id)
Index("ix_tree_status_user_id", tree_status_table.c.user_id)

_engine: Engine | None = None


def _normalizar_database_url(database_url: str) -> str:
    url = database_url.strip()

    if url.startswith("postgresql+psycopg://"):
        return url

    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")

    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")

    raise RuntimeError(
        "DATABASE_URL precisa iniciar com postgresql://, postgres:// "
        "ou postgresql+psycopg://."
    )


def _sqlite_url(database_file: str) -> str:
    path = Path(database_file).resolve()
    return f"sqlite:///{path.as_posix()}"


def _resolve_url_banco() -> str:
    if DATABASE_URL:
        return _normalizar_database_url(DATABASE_URL)

    if ENVIRONMENT in ("production", "prod"):
        raise RuntimeError(
            "DATABASE_URL precisa ser configurada em producao. "
            "O backend nao usa SQLite em producao."
        )

    return _sqlite_url(DATABASE_FILE)


def _is_sqlite_url(url: str) -> bool:
    return url.startswith("sqlite:")


def _configurar_sqlite(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _habilitar_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_engine() -> Engine:
    global _engine

    if _engine is not None:
        return _engine

    url = _resolve_url_banco()
    kwargs: dict[str, Any] = {
        "future": True,
        "pool_pre_ping": True,
    }

    if _is_sqlite_url(url):
        kwargs["connect_args"] = {"check_same_thread": False}

    engine = create_engine(url, **kwargs)

    if _is_sqlite_url(url):
        _configurar_sqlite(engine)

    _engine = engine
    return _engine


def configurar_banco(
    *,
    database_url: str | None = None,
    database_file: str | None = None,
    environment: str | None = None,
) -> None:
    global DATABASE_URL, DATABASE_FILE, ENVIRONMENT, _engine

    if _engine is not None:
        _engine.dispose()

    DATABASE_URL = config.DATABASE_URL if database_url is None else database_url
    DATABASE_FILE = config.DATABASE_FILE if database_file is None else database_file
    ENVIRONMENT = config.ENVIRONMENT if environment is None else environment
    _engine = None


def configurar_banco_para_testes(
    *,
    database_url: str | None = None,
    database_file: str | None = None,
    environment: str | None = None,
) -> None:
    configurar_banco(
        database_url=database_url,
        database_file=database_file,
        environment=environment,
    )


def tipo_banco() -> str:
    url = _resolve_url_banco()
    if _is_sqlite_url(url):
        return "sqlite"
    return "postgresql"


def descricao_banco_segura() -> str:
    return tipo_banco()


@contextmanager
def transacao():
    with get_engine().begin() as conn:
        yield conn


def executar_select_um(statement, params: dict[str, Any] | None = None):
    with get_engine().connect() as conn:
        row = conn.execute(statement, params or {}).mappings().first()
        return dict(row) if row is not None else None


def executar_select_todos(statement, params: dict[str, Any] | None = None):
    with get_engine().connect() as conn:
        rows = conn.execute(statement, params or {}).mappings().all()
        return [dict(row) for row in rows]


def row_para_dict(row):
    if row is None:
        return None
    return dict(row)


def valor_monetario(value):
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return float(value)
    return value


def timestamp_para_api(value):
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


def verificar_conexao_banco() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def _colunas_da_tabela(conn: Connection, tabela: str):
    return {coluna["name"] for coluna in inspect(conn).get_columns(tabela)}


def _calcular_nivel(pontos: int):
    if pontos < 10:
        return 1, "Semente"

    if pontos < 25:
        return 2, "Broto"

    if pontos < 50:
        return 3, "Muda"

    if pontos < 100:
        return 4, "Árvore pequena"

    if pontos < 200:
        return 5, "Árvore grande"

    return 6, "Floresta"


def _scalar_number(conn: Connection, statement):
    value = conn.execute(statement).scalar_one()
    return value or 0


def _calcular_pontos_automaticos_connection(conn: Connection, user_id: int):
    total_ganhos = _scalar_number(
        conn,
        select(func.coalesce(func.sum(transactions_table.c.valor), 0)).where(
            transactions_table.c.user_id == user_id,
            transactions_table.c.tipo == "ganho",
        ),
    )

    total_gastos = _scalar_number(
        conn,
        select(func.coalesce(func.sum(transactions_table.c.valor), 0)).where(
            transactions_table.c.user_id == user_id,
            transactions_table.c.tipo == "gasto",
        ),
    )

    total_transacoes = _scalar_number(
        conn,
        select(func.count()).select_from(transactions_table).where(
            transactions_table.c.user_id == user_id
        ),
    )

    metas_concluidas = _scalar_number(
        conn,
        select(func.count()).select_from(goals_table).where(
            goals_table.c.user_id == user_id,
            goals_table.c.status == "concluída",
        ),
    )

    saldo = total_ganhos - total_gastos
    pontos_por_saldo = 0

    if saldo > 0:
        pontos_por_saldo = int(saldo // 50) * 5

    return (
        pontos_por_saldo
        + (int(metas_concluidas) * 10)
        + (int(total_transacoes) * 1)
    )


def _migracao_separar_pontos_arvore(conn: Connection):
    colunas = _colunas_da_tabela(conn, "tree_status")

    if "pontos_manuais" not in colunas:
        conn.execute(text("""
            ALTER TABLE tree_status
            ADD COLUMN pontos_manuais INTEGER NOT NULL DEFAULT 0
        """))

    if "pontos_automaticos" not in colunas:
        conn.execute(text("""
            ALTER TABLE tree_status
            ADD COLUMN pontos_automaticos INTEGER NOT NULL DEFAULT 0
        """))

    migracao_existente = conn.execute(
        select(schema_migrations_table.c.id).where(
            schema_migrations_table.c.nome == MIGRATION_SPLIT_TREE_POINTS
        )
    ).first()

    if migracao_existente is not None:
        return

    arvores = conn.execute(
        select(
            tree_status_table.c.id,
            tree_status_table.c.user_id,
            func.coalesce(tree_status_table.c.pontos, 0).label("pontos"),
        )
    ).mappings().all()

    for arvore in arvores:
        pontos_existentes = arvore["pontos"]
        pontos_automaticos = _calcular_pontos_automaticos_connection(
            conn,
            arvore["user_id"],
        )
        pontos_manuais = max(int(pontos_existentes) - pontos_automaticos, 0)
        pontos_totais = pontos_manuais + pontos_automaticos
        nivel, nome_nivel = _calcular_nivel(pontos_totais)

        conn.execute(
            update(tree_status_table)
            .where(tree_status_table.c.id == arvore["id"])
            .values(
                pontos_manuais=pontos_manuais,
                pontos_automaticos=pontos_automaticos,
                pontos=pontos_totais,
                nivel=nivel,
                nome_nivel=nome_nivel,
            )
        )

    conn.execute(
        insert(schema_migrations_table).values(
            nome=MIGRATION_SPLIT_TREE_POINTS
        )
    )


def _registrar_migracao_se_necessario(conn: Connection, nome: str) -> None:
    migracao_existente = conn.execute(
        select(schema_migrations_table.c.id).where(
            schema_migrations_table.c.nome == nome
        )
    ).first()

    if migracao_existente is None:
        conn.execute(insert(schema_migrations_table).values(nome=nome))


def _migracao_seguranca_supabase_rls(conn: Connection) -> None:
    if conn.dialect.name != "postgresql":
        return

    conn.execute(text("""
        DO $$
        DECLARE
            table_name text;
            role_name text;
            sequence_name text;
        BEGIN
            FOREACH table_name IN ARRAY ARRAY[
                'users',
                'transactions',
                'goals',
                'tree_status',
                'schema_migrations'
            ]
            LOOP
                EXECUTE format(
                    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
                    table_name
                );

                FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
                LOOP
                    IF to_regrole(role_name) IS NOT NULL THEN
                        EXECUTE format(
                            'REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM %I',
                            table_name,
                            role_name
                        );

                        sequence_name := pg_get_serial_sequence(
                            format('public.%I', table_name),
                            'id'
                        );

                        IF sequence_name IS NOT NULL THEN
                            EXECUTE format(
                                'REVOKE USAGE, SELECT, UPDATE ON SEQUENCE %s FROM %I',
                                sequence_name,
                                role_name
                            );
                        END IF;
                    END IF;
                END LOOP;
            END LOOP;
        END
        $$;
    """))

    _registrar_migracao_se_necessario(
        conn,
        MIGRATION_SUPABASE_RLS_SECURITY,
    )


def criar_tabelas():
    try:
        with get_engine().begin() as conn:
            metadata.create_all(conn)
            _migracao_separar_pontos_arvore(conn)
            _migracao_seguranca_supabase_rls(conn)
    except SQLAlchemyError:
        raise
