import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, insert, select, text, update
from sqlalchemy.exc import SQLAlchemyError

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import database  # noqa: E402


TABLE_PRIVILEGES = (
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
)
SEQUENCE_PRIVILEGES = ("USAGE", "SELECT", "UPDATE")


def scalar(conn, statement, params=None):
    return conn.execute(text(statement), params or {}).scalar_one_or_none()


def fail_if(condition, message, failures):
    if condition:
        failures.append(message)


def role_exists(conn, role_name):
    return scalar(
        conn,
        "SELECT to_regrole(:role_name)::text",
        {"role_name": role_name},
    ) is not None


def table_rls_status(conn, table_name):
    return conn.execute(text("""
        SELECT c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = :table_name
          AND c.relkind IN ('r', 'p')
    """), {"table_name": table_name}).mappings().first()


def policy_count(conn, table_name):
    return scalar(conn, """
        SELECT COUNT(*)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = :table_name
    """, {"table_name": table_name}) or 0


def has_table_privilege(conn, role_name, table_name, privilege):
    return bool(scalar(conn, """
        SELECT has_table_privilege(:role_name, :qualified_table, :privilege)
    """, {
        "role_name": role_name,
        "qualified_table": f"public.{table_name}",
        "privilege": privilege,
    }))


def related_sequence(conn, table_name):
    return scalar(conn, """
        SELECT pg_get_serial_sequence(:qualified_table, 'id')
    """, {"qualified_table": f"public.{table_name}"})


def has_sequence_privilege(conn, role_name, sequence_name, privilege):
    return bool(scalar(conn, """
        SELECT has_sequence_privilege(:role_name, :sequence_name, :privilege)
    """, {
        "role_name": role_name,
        "sequence_name": sequence_name,
        "privilege": privilege,
    }))


def check_rls_and_grants(conn):
    failures = []

    for table_name in database.APPLICATION_TABLE_NAMES:
        status = table_rls_status(conn, table_name)
        fail_if(status is None, f"Tabela public.{table_name} nao encontrada.", failures)

        if status is None:
            continue

        fail_if(
            not status["relrowsecurity"],
            f"RLS nao esta habilitada em public.{table_name}.",
            failures,
        )
        fail_if(
            status["relforcerowsecurity"],
            f"FORCE RLS esta habilitado em public.{table_name}.",
            failures,
        )
        fail_if(
            policy_count(conn, table_name) != 0,
            f"public.{table_name} tem policies criadas.",
            failures,
        )

        sequence_name = related_sequence(conn, table_name)

        for role_name in database.SUPABASE_DATA_API_ROLES:
            if not role_exists(conn, role_name):
                continue

            for privilege in TABLE_PRIVILEGES:
                fail_if(
                    has_table_privilege(conn, role_name, table_name, privilege),
                    f"{role_name} ainda tem {privilege} em public.{table_name}.",
                    failures,
                )

            if sequence_name:
                for privilege in SEQUENCE_PRIVILEGES:
                    fail_if(
                        has_sequence_privilege(
                            conn,
                            role_name,
                            sequence_name,
                            privilege,
                        ),
                        f"{role_name} ainda tem {privilege} em {sequence_name}.",
                        failures,
                    )

    return failures


def check_backend_crud(engine):
    connection = engine.connect()
    transaction = connection.begin()
    suffix = uuid4().hex
    email = f"ecotree-security-check-{suffix}@example.invalid"

    try:
        user_id = connection.execute(
            insert(database.users_table).values(
                nome="Security Check",
                email=email,
                senha="verification-hash",
            )
        ).inserted_primary_key[0]

        connection.execute(
            select(database.users_table.c.id).where(
                database.users_table.c.id == user_id
            )
        ).first()

        connection.execute(
            update(database.users_table)
            .where(database.users_table.c.id == user_id)
            .values(nome="Security Check Updated")
        )

        tree_id = connection.execute(
            insert(database.tree_status_table).values(user_id=user_id)
        ).inserted_primary_key[0]

        transaction_id = connection.execute(
            insert(database.transactions_table).values(
                user_id=user_id,
                tipo="ganho",
                categoria="Security",
                valor=10,
                descricao="Security check",
            )
        ).inserted_primary_key[0]

        goal_id = connection.execute(
            insert(database.goals_table).values(
                user_id=user_id,
                titulo="Security goal",
                valor_meta=100,
                valor_atual=10,
                prazo=None,
                status="em andamento",
            )
        ).inserted_primary_key[0]

        connection.execute(
            update(database.transactions_table)
            .where(database.transactions_table.c.id == transaction_id)
            .values(valor=20)
        )
        connection.execute(
            update(database.goals_table)
            .where(database.goals_table.c.id == goal_id)
            .values(valor_atual=20)
        )
        connection.execute(
            update(database.tree_status_table)
            .where(database.tree_status_table.c.id == tree_id)
            .values(pontos=1)
        )

        connection.execute(
            delete(database.goals_table).where(database.goals_table.c.id == goal_id)
        )
        connection.execute(
            delete(database.transactions_table).where(
                database.transactions_table.c.id == transaction_id
            )
        )
        connection.execute(
            delete(database.tree_status_table).where(
                database.tree_status_table.c.id == tree_id
            )
        )
        connection.execute(
            delete(database.users_table).where(database.users_table.c.id == user_id)
        )

    finally:
        transaction.rollback()
        connection.close()


def main():
    try:
        if database.tipo_banco() != "postgresql":
            print("Esta verificacao exige DATABASE_URL de PostgreSQL.")
            return 2

        database.criar_tabelas()
        engine = database.get_engine()

        with engine.connect() as conn:
            failures = check_rls_and_grants(conn)

        if failures:
            print("Falha na verificacao de seguranca Supabase:")
            for failure in failures:
                print(f"- {failure}")
            return 1

        check_backend_crud(engine)

    except SQLAlchemyError as exc:
        print(f"Falha segura de banco durante verificacao: {exc.__class__.__name__}")
        return 1
    except RuntimeError as exc:
        print(f"Falha de configuracao: {exc}")
        return 1

    print("Seguranca Supabase OK: RLS habilitada, roles Data API sem acesso e backend operacional.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
