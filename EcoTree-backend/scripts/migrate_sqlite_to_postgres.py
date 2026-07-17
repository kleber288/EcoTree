import argparse
import os
import sqlite3
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import inspect, insert, select, text
from sqlalchemy.exc import SQLAlchemyError

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import database  # noqa: E402


IMPORT_ORDER = ("users", "tree_status", "transactions", "goals")
SEQUENCE_TABLES = ("users", "tree_status", "transactions", "goals", "schema_migrations")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Copia dados do SQLite local para PostgreSQL."
    )
    parser.add_argument(
        "--sqlite-file",
        default=database.DATABASE_FILE,
        help="Caminho do arquivo SQLite de origem."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra contagens e conflitos sem gravar no PostgreSQL."
    )
    parser.add_argument(
        "--confirm-import",
        action="store_true",
        help="Confirma explicitamente a importacao para o PostgreSQL."
    )
    return parser.parse_args()


def abrir_sqlite_somente_leitura(sqlite_file: str):
    path = Path(sqlite_file).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Arquivo SQLite nao encontrado: {path}")

    uri = f"file:{path.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def buscar_linhas_sqlite(conn, table_name: str):
    return [
        dict(row)
        for row in conn.execute(f"SELECT * FROM {table_name} ORDER BY id").fetchall()
    ]


def parse_timestamp(value):
    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value

    text_value = str(value)
    for formato in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text_value[:19], formato)
        except ValueError:
            continue

    return value


def decimal_from_value(value):
    if value is None:
        return None
    return Decimal(str(value))


def target_table_names(conn):
    return set(inspect(conn).get_table_names())


def existing_ids(conn, table, table_names):
    if table.name not in table_names:
        return set()

    return {
        row[0]
        for row in conn.execute(select(table.c.id)).all()
    }


def existing_users(conn, table_names):
    if "users" not in table_names:
        return {}, {}

    rows = conn.execute(
        select(database.users_table.c.id, database.users_table.c.email)
    ).mappings().all()

    by_id = {row["id"]: row for row in rows}
    by_email = {row["email"].strip().lower(): row for row in rows}
    return by_id, by_email


def source_tables(sqlite_conn):
    rows = sqlite_conn.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
    """).fetchall()
    return {row["name"] for row in rows}


def load_source(sqlite_conn):
    available = source_tables(sqlite_conn)
    missing = [table for table in IMPORT_ORDER if table not in available]

    if missing:
        raise RuntimeError(
            "SQLite de origem nao contem as tabelas esperadas: "
            + ", ".join(missing)
        )

    return {
        table: buscar_linhas_sqlite(sqlite_conn, table)
        for table in IMPORT_ORDER
    }


def summarize_source(source):
    print("Origem SQLite:")
    for table in IMPORT_ORDER:
        print(f"- {table}: {len(source[table])} registros")


def plan_or_import(source, dry_run: bool):
    database_url = os.getenv("DATABASE_URL", "").strip()

    if not database_url:
        raise RuntimeError("DATABASE_URL precisa estar definida no ambiente.")

    database.configurar_banco(
        database_url=database_url,
        environment=os.getenv("ECOTREE_ENV", "production"),
    )

    if database.tipo_banco() != "postgresql":
        raise RuntimeError("O destino da migracao precisa ser PostgreSQL.")

    if not dry_run:
        database.criar_tabelas()

    counts = {
        "users_inserted": 0,
        "users_skipped_existing": 0,
        "tree_status_inserted": 0,
        "tree_status_skipped": 0,
        "transactions_inserted": 0,
        "transactions_skipped": 0,
        "goals_inserted": 0,
        "goals_skipped": 0,
        "orphans_skipped": 0,
    }

    engine = database.get_engine()

    with engine.begin() as conn:
        table_names = target_table_names(conn)
        users_by_id, users_by_email = existing_users(conn, table_names)
        existing_tree_ids = existing_ids(conn, database.tree_status_table, table_names)
        existing_transaction_ids = existing_ids(conn, database.transactions_table, table_names)
        existing_goal_ids = existing_ids(conn, database.goals_table, table_names)
        existing_tree_user_ids = set()

        if "tree_status" in table_names:
            existing_tree_user_ids = {
                row[0]
                for row in conn.execute(
                    select(database.tree_status_table.c.user_id)
                ).all()
            }

        user_id_map = {}

        for row in source["users"]:
            email = row["email"].strip().lower()

            if row["id"] in users_by_id:
                user_id_map[row["id"]] = users_by_id[row["id"]]["id"]
                counts["users_skipped_existing"] += 1
                continue

            if email in users_by_email:
                user_id_map[row["id"]] = users_by_email[email]["id"]
                counts["users_skipped_existing"] += 1
                continue

            user_id_map[row["id"]] = row["id"]
            counts["users_inserted"] += 1

            if not dry_run:
                conn.execute(
                    insert(database.users_table).values(
                        id=row["id"],
                        nome=row["nome"],
                        email=email,
                        senha=row["senha"],
                        created_at=parse_timestamp(row.get("created_at")),
                    )
                )

        for row in source["tree_status"]:
            mapped_user_id = user_id_map.get(row["user_id"])

            if mapped_user_id is None:
                counts["orphans_skipped"] += 1
                counts["tree_status_skipped"] += 1
                continue

            if row["id"] in existing_tree_ids or mapped_user_id in existing_tree_user_ids:
                counts["tree_status_skipped"] += 1
                continue

            counts["tree_status_inserted"] += 1

            if not dry_run:
                conn.execute(
                    insert(database.tree_status_table).values(
                        id=row["id"],
                        user_id=mapped_user_id,
                        pontos=row.get("pontos", 0),
                        pontos_manuais=row.get("pontos_manuais", 0),
                        pontos_automaticos=row.get("pontos_automaticos", 0),
                        nivel=row.get("nivel", 1),
                        nome_nivel=row.get("nome_nivel", "Semente"),
                    )
                )

        for row in source["transactions"]:
            mapped_user_id = user_id_map.get(row["user_id"])

            if mapped_user_id is None:
                counts["orphans_skipped"] += 1
                counts["transactions_skipped"] += 1
                continue

            if row["id"] in existing_transaction_ids:
                counts["transactions_skipped"] += 1
                continue

            counts["transactions_inserted"] += 1

            if not dry_run:
                conn.execute(
                    insert(database.transactions_table).values(
                        id=row["id"],
                        user_id=mapped_user_id,
                        tipo=row["tipo"],
                        categoria=row["categoria"],
                        valor=decimal_from_value(row["valor"]),
                        descricao=row.get("descricao"),
                        created_at=parse_timestamp(row.get("created_at")),
                    )
                )

        for row in source["goals"]:
            mapped_user_id = user_id_map.get(row["user_id"])

            if mapped_user_id is None:
                counts["orphans_skipped"] += 1
                counts["goals_skipped"] += 1
                continue

            if row["id"] in existing_goal_ids:
                counts["goals_skipped"] += 1
                continue

            counts["goals_inserted"] += 1

            if not dry_run:
                conn.execute(
                    insert(database.goals_table).values(
                        id=row["id"],
                        user_id=mapped_user_id,
                        titulo=row["titulo"],
                        valor_meta=decimal_from_value(row["valor_meta"]),
                        valor_atual=decimal_from_value(row.get("valor_atual", 0)),
                        prazo=row.get("prazo"),
                        status=row.get("status", "em andamento"),
                    )
                )

        if not dry_run:
            sync_postgres_sequences(conn)

    return counts


def sync_postgres_sequences(conn):
    for table_name in SEQUENCE_TABLES:
        conn.execute(text(f"""
            SELECT setval(
                pg_get_serial_sequence('{table_name}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                (SELECT COUNT(*) FROM {table_name}) > 0
            )
        """))


def print_counts(counts, dry_run: bool):
    titulo = "Plano de migracao" if dry_run else "Migracao concluida"
    print(titulo + ":")
    for key, value in counts.items():
        print(f"- {key}: {value}")


def main():
    args = parse_args()

    if not args.dry_run and not args.confirm_import:
        print(
            "Use --dry-run para simular ou --confirm-import para importar. "
            "Nenhum dado foi alterado."
        )
        return 2

    try:
        sqlite_conn = abrir_sqlite_somente_leitura(args.sqlite_file)
        try:
            source = load_source(sqlite_conn)
        finally:
            sqlite_conn.close()

        summarize_source(source)
        counts = plan_or_import(source, args.dry_run)
        print_counts(counts, args.dry_run)
        return 0

    except (FileNotFoundError, RuntimeError, SQLAlchemyError, sqlite3.Error) as exc:
        print(f"Erro seguro de migracao: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
