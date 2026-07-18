import asyncio
from decimal import Decimal
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import database  # noqa: E402
from auth import verificar_token  # noqa: E402
from config import _resolve_allowed_origins  # noqa: E402
from main import app  # noqa: E402
from routes import goals, transactions, tree, users  # noqa: E402
from schemas import (  # noqa: E402
    GoalCreateAuthenticated,
    GoalProgress,
    GoalUpdate,
    TransactionCreateAuthenticated,
    TreeAddPoints,
    UserCreate,
    UserLogin,
)


ORIGINAL_DATABASE_URL = database.DATABASE_URL
ORIGINAL_DATABASE_FILE = database.DATABASE_FILE
ORIGINAL_ENVIRONMENT = database.ENVIRONMENT


def configure_temp_database(db_path):
    database.configurar_banco_para_testes(
        database_url="",
        database_file=str(db_path),
        environment="development",
    )


def restore_database_config():
    database.configurar_banco_para_testes(
        database_url=ORIGINAL_DATABASE_URL,
        database_file=ORIGINAL_DATABASE_FILE,
        environment=ORIGINAL_ENVIRONMENT,
    )


async def make_asgi_request(method, path, headers):
    messages = []
    request_sent = False

    async def receive():
        nonlocal request_sent
        if request_sent:
            return {"type": "http.disconnect"}
        request_sent = True
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "https",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": [
            (name.lower().encode("ascii"), value.encode("ascii"))
            for name, value in headers.items()
        ],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 443),
    }

    await app(scope, receive, send)
    response_start = next(
        message for message in messages
        if message["type"] == "http.response.start"
    )
    response_headers = {
        name.decode("latin-1").lower(): value.decode("latin-1")
        for name, value in response_start["headers"]
    }
    return response_start["status"], response_headers


def create_old_schema(db_path):
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            categoria TEXT NOT NULL,
            valor REAL NOT NULL,
            descricao TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            valor_meta REAL NOT NULL,
            valor_atual REAL DEFAULT 0,
            prazo TEXT,
            status TEXT DEFAULT 'em andamento',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE tree_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pontos INTEGER DEFAULT 0,
            nivel INTEGER DEFAULT 1,
            nome_nivel TEXT DEFAULT 'Semente',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()


def seed_user_with_auto_points(db_path, user_id, pontos_existentes):
    conn = sqlite3.connect(db_path)
    conn.execute("""
        INSERT INTO users (id, nome, email, senha)
        VALUES (?, ?, ?, ?)
    """, (
        user_id,
        f"User {user_id}",
        f"user{user_id}@example.com",
        "hash"
    ))
    conn.execute("""
        INSERT INTO tree_status (user_id, pontos, nivel, nome_nivel)
        VALUES (?, ?, ?, ?)
    """, (user_id, pontos_existentes, 1, "Semente"))

    conn.execute("""
        INSERT INTO transactions (user_id, tipo, categoria, valor, descricao)
        VALUES (?, 'ganho', 'Teste', 50, 'A')
    """, (user_id,))
    conn.execute("""
        INSERT INTO transactions (user_id, tipo, categoria, valor, descricao)
        VALUES (?, 'ganho', 'Teste', 50, 'B')
    """, (user_id,))
    conn.commit()
    conn.close()


def fetch_tree_rows(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT user_id, pontos, pontos_manuais, pontos_automaticos
        FROM tree_status
        ORDER BY user_id
    """).fetchall()
    conn.close()
    return [dict(row) for row in rows]


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "migration.db"
        configure_temp_database(self.db_path)

    def tearDown(self):
        restore_database_config()
        self.temp_dir.cleanup()

    def test_migration_backfills_manual_and_automatic_points_once(self):
        create_old_schema(self.db_path)
        seed_user_with_auto_points(self.db_path, 1, 20)
        seed_user_with_auto_points(self.db_path, 2, 12)
        seed_user_with_auto_points(self.db_path, 3, 5)

        database.criar_tabelas()

        self.assertEqual(fetch_tree_rows(self.db_path), [
            {
                "user_id": 1,
                "pontos": 20,
                "pontos_manuais": 8,
                "pontos_automaticos": 12
            },
            {
                "user_id": 2,
                "pontos": 12,
                "pontos_manuais": 0,
                "pontos_automaticos": 12
            },
            {
                "user_id": 3,
                "pontos": 12,
                "pontos_manuais": 0,
                "pontos_automaticos": 12
            }
        ])

        first_result = fetch_tree_rows(self.db_path)
        database.criar_tabelas()
        second_result = fetch_tree_rows(self.db_path)

        self.assertEqual(second_result, first_result)

        conn = sqlite3.connect(self.db_path)
        migration_count = conn.execute("""
            SELECT COUNT(*)
            FROM schema_migrations
            WHERE nome = ?
        """, (database.MIGRATION_SPLIT_TREE_POINTS,)).fetchone()[0]
        conn.close()

        self.assertEqual(migration_count, 1)

    def test_failed_migration_rolls_back_columns_and_data(self):
        create_old_schema(self.db_path)
        seed_user_with_auto_points(self.db_path, 1, 20)

        with patch(
            "database._calcular_pontos_automaticos_connection",
            side_effect=RuntimeError("forced failure")
        ):
            with self.assertRaises(RuntimeError):
                database.criar_tabelas()

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        tables = {
            row["name"]
            for row in conn.execute("""
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
            """).fetchall()
        }
        migration_count = 0
        if "schema_migrations" in tables:
            migration_count = conn.execute("""
                SELECT COUNT(*)
                FROM schema_migrations
                WHERE nome = ?
            """, (database.MIGRATION_SPLIT_TREE_POINTS,)).fetchone()[0]
        pontos = conn.execute("""
            SELECT pontos
            FROM tree_status
            WHERE user_id = 1
        """).fetchone()["pontos"]
        conn.close()

        self.assertEqual(migration_count, 0)
        self.assertEqual(pontos, 20)

        database.criar_tabelas()
        self.assertEqual(fetch_tree_rows(self.db_path), [{
            "user_id": 1,
            "pontos": 20,
            "pontos_manuais": 8,
            "pontos_automaticos": 12
        }])


class ApiDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "api.db"
        configure_temp_database(self.db_path)
        database.criar_tabelas()

    def tearDown(self):
        restore_database_config()
        self.temp_dir.cleanup()

    def register(self, email="ana@example.com", nome="Ana Teste"):
        return users.cadastrar_usuario(UserCreate(
            nome=nome,
            email=email,
            senha="segredo123"
        ))

    def login(self, email="ana@example.com", senha="segredo123"):
        return users.login_usuario(UserLogin(email=email, senha=senha))

    def auth_payload(self, email="ana@example.com"):
        login_response = self.login(email=email)
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=login_response["access_token"],
        )
        return verificar_token(credentials)

    def tree_row(self, user_id):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        row = conn.execute("""
            SELECT pontos, pontos_manuais, pontos_automaticos, nivel, nome_nivel
            FROM tree_status
            WHERE user_id = ?
        """, (user_id,)).fetchone()
        conn.close()
        return dict(row)

    def test_schema_initialization_creates_expected_tables(self):
        conn = sqlite3.connect(self.db_path)
        tables = {
            row[0]
            for row in conn.execute("""
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
            """).fetchall()
        }
        conn.close()

        self.assertTrue({
            "users",
            "transactions",
            "goals",
            "tree_status",
            "schema_migrations",
        }.issubset(tables))

    def test_register_duplicate_login_and_users_me(self):
        register_response = self.register("ANA@Example.com")
        user_id = register_response["usuario"]["id"]

        self.assertEqual(register_response["usuario"]["email"], "ana@example.com")
        self.assertEqual(self.tree_row(user_id), {
            "pontos": 0,
            "pontos_manuais": 0,
            "pontos_automaticos": 0,
            "nivel": 1,
            "nome_nivel": "Semente"
        })

        with self.assertRaises(HTTPException) as duplicate:
            self.register("ana@example.com")

        self.assertEqual(duplicate.exception.status_code, 400)

        login_response = self.login("ANA@example.com")
        self.assertEqual(login_response["usuario"]["id"], user_id)
        self.assertEqual(login_response["token_type"], "bearer")

        with self.assertRaises(HTTPException) as bad_login:
            self.login("ana@example.com", senha="senha-errada")

        self.assertEqual(bad_login.exception.status_code, 401)

        usuario_logado = self.auth_payload("ana@example.com")
        me_response = users.meu_perfil(usuario_logado=usuario_logado)

        self.assertEqual(me_response["usuario"]["user_id"], user_id)
        self.assertEqual(me_response["usuario"]["email"], "ana@example.com")

    def test_json_contracts_for_core_flows(self):
        register_response = self.register("contratos@example.com")
        self.assertEqual(set(register_response.keys()), {
            "mensagem",
            "usuario",
            "arvore",
        })
        self.assertEqual(set(register_response["usuario"].keys()), {
            "id",
            "nome",
            "email",
        })
        self.assertEqual(set(register_response["arvore"].keys()), {
            "nivel",
            "nome_nivel",
            "pontos",
        })

        usuario_logado = self.auth_payload("contratos@example.com")
        login_response = self.login("contratos@example.com")
        self.assertEqual(set(login_response.keys()), {
            "mensagem",
            "usuario",
            "access_token",
            "token_type",
        })
        self.assertEqual(set(login_response["usuario"].keys()), {
            "id",
            "nome",
            "email",
            "created_at",
        })

        tree_response = tree.status_arvore_logada(usuario_logado=usuario_logado)
        self.assertEqual(set(tree_response["arvore"].keys()), {
            "id",
            "user_id",
            "pontos",
            "nivel",
            "nome_nivel",
            "proximo_nivel",
            "pontos_para_proximo_nivel",
        })

        transaction_response = transactions.criar_transacao(
            TransactionCreateAuthenticated(
                tipo="ganho",
                categoria="Contrato",
                valor=10,
                descricao="Teste"
            ),
            usuario_logado=usuario_logado
        )
        self.assertEqual(set(transaction_response.keys()), {
            "mensagem",
            "transacao",
            "arvore_atualizada",
        })
        self.assertEqual(set(transaction_response["transacao"].keys()), {
            "id",
            "user_id",
            "tipo",
            "categoria",
            "valor",
            "descricao",
        })

        summary_response = transactions.resumo_transacoes_usuario_logado(
            usuario_logado=usuario_logado
        )
        self.assertEqual(set(summary_response.keys()), {
            "mensagem",
            "user_id",
            "total_ganhos",
            "total_gastos",
            "saldo",
            "total_transacoes",
        })

        goal_response = goals.criar_meta(
            GoalCreateAuthenticated(
                titulo="Contrato meta",
                valor_meta=100,
                valor_atual=5,
                prazo=None
            ),
            usuario_logado=usuario_logado
        )
        self.assertEqual(set(goal_response.keys()), {
            "mensagem",
            "meta",
            "arvore_atualizada",
        })
        self.assertEqual(set(goal_response["meta"].keys()), {
            "id",
            "user_id",
            "titulo",
            "valor_meta",
            "valor_atual",
            "valor_restante",
            "progresso_percentual",
            "prazo",
            "status",
        })

    def test_decimal_money_values_keep_json_contract(self):
        meta = goals.montar_meta({
            "id": 1,
            "user_id": 1,
            "titulo": "Decimal",
            "valor_meta": Decimal("100.50"),
            "valor_atual": Decimal("25.25"),
            "prazo": None,
            "status": "em andamento",
        })
        self.assertEqual(meta["valor_meta"], 100.5)
        self.assertEqual(meta["valor_atual"], 25.25)
        self.assertEqual(meta["valor_restante"], 75.25)
        self.assertEqual(meta["progresso_percentual"], 25.12)

        transacao = transactions._montar_transacao({
            "id": 1,
            "user_id": 1,
            "tipo": "ganho",
            "categoria": "Decimal",
            "valor": Decimal("12.34"),
            "descricao": None,
            "created_at": None,
        })
        self.assertEqual(transacao["valor"], 12.34)

    def test_tree_transaction_summary_and_delete_flow(self):
        user_id = self.register("transacoes@example.com")["usuario"]["id"]
        usuario_logado = self.auth_payload("transacoes@example.com")

        tree_response = tree.status_arvore_logada(usuario_logado=usuario_logado)
        self.assertEqual(tree_response["arvore"]["pontos"], 0)

        manual_response = tree.adicionar_pontos_arvore_logada(
            TreeAddPoints(pontos=15, motivo="Teste manual"),
            usuario_logado=usuario_logado,
        )
        self.assertEqual(manual_response["arvore"]["pontos"], 15)

        create_response = transactions.criar_transacao(
            TransactionCreateAuthenticated(
                tipo="ganho",
                categoria="Teste",
                valor=100,
                descricao="Registro automatico"
            ),
            usuario_logado=usuario_logado
        )
        transaction_id = create_response["transacao"]["id"]

        list_response = transactions.listar_transacoes_logado(
            usuario_logado=usuario_logado
        )
        self.assertEqual(list_response["total"], 1)
        self.assertEqual(list_response["transacoes"][0]["valor"], 100.0)

        summary = transactions.resumo_transacoes_usuario_logado(
            usuario_logado=usuario_logado
        )
        self.assertEqual(summary["total_ganhos"], 100.0)
        self.assertEqual(summary["total_gastos"], 0)
        self.assertEqual(summary["saldo"], 100.0)
        self.assertEqual(summary["total_transacoes"], 1)
        self.assertEqual(
            create_response["arvore_atualizada"]["pontos"],
            26
        )
        self.assertEqual(self.tree_row(user_id)["pontos_manuais"], 15)
        self.assertEqual(self.tree_row(user_id)["pontos_automaticos"], 11)

        delete_response = transactions.deletar_transacao(
            transaction_id,
            usuario_logado=usuario_logado
        )
        self.assertEqual(delete_response["arvore_atualizada"]["pontos"], 15)
        self.assertEqual(self.tree_row(user_id)["pontos_automaticos"], 0)

    def test_goal_create_update_progress_complete_and_delete(self):
        user_id = self.register("metas@example.com")["usuario"]["id"]
        usuario_logado = self.auth_payload("metas@example.com")

        tree.adicionar_pontos_arvore_logada(
            TreeAddPoints(pontos=20, motivo="Teste manual"),
            usuario_logado=usuario_logado,
        )

        create_response = goals.criar_meta(
            GoalCreateAuthenticated(
                titulo="Meta teste",
                valor_meta=100,
                valor_atual=0,
                prazo="2026-12-31"
            ),
            usuario_logado=usuario_logado
        )
        goal_id = create_response["meta"]["id"]
        self.assertEqual(create_response["meta"]["status"], "em andamento")

        list_response = goals.listar_metas_logado(usuario_logado=usuario_logado)
        self.assertEqual(list_response["total"], 1)

        update_response = goals.atualizar_meta(
            goal_id,
            GoalUpdate(valor_atual=50),
            usuario_logado=usuario_logado
        )
        self.assertEqual(update_response["meta"]["valor_atual"], 50.0)
        self.assertEqual(update_response["arvore_atualizada"]["pontos"], 20)

        progress_response = goals.adicionar_progresso_meta(
            goal_id,
            GoalProgress(valor_adicionado=50),
            usuario_logado=usuario_logado
        )
        self.assertEqual(progress_response["meta"]["status"], "concluída")
        self.assertEqual(progress_response["arvore_atualizada"]["pontos"], 30)
        self.assertEqual(self.tree_row(user_id)["pontos_manuais"], 20)
        self.assertEqual(self.tree_row(user_id)["pontos_automaticos"], 10)

        found_response = goals.buscar_meta(goal_id, usuario_logado=usuario_logado)
        self.assertEqual(found_response["meta"]["id"], goal_id)

        delete_response = goals.deletar_meta(goal_id, usuario_logado=usuario_logado)
        self.assertEqual(delete_response["arvore_atualizada"]["pontos"], 20)

    def test_user_data_isolation(self):
        user_1 = self.register("um@example.com", "Usuario Um")["usuario"]["id"]
        user_2 = self.register("dois@example.com", "Usuario Dois")["usuario"]["id"]
        auth_1 = self.auth_payload("um@example.com")
        auth_2 = self.auth_payload("dois@example.com")

        transaction_response = transactions.criar_transacao(
            TransactionCreateAuthenticated(
                tipo="gasto",
                categoria="Teste",
                valor=25,
                descricao=None
            ),
            usuario_logado=auth_1
        )

        goal_response = goals.criar_meta(
            GoalCreateAuthenticated(
                titulo="Meta privada",
                valor_meta=200,
                valor_atual=0,
                prazo=None
            ),
            usuario_logado=auth_1
        )

        with self.assertRaises(HTTPException) as list_forbidden:
            transactions.listar_transacoes_usuario(user_1, usuario_logado=auth_2)

        with self.assertRaises(HTTPException) as delete_forbidden:
            transactions.deletar_transacao(
                transaction_response["transacao"]["id"],
                usuario_logado=auth_2
            )

        with self.assertRaises(HTTPException) as goal_forbidden:
            goals.buscar_meta(goal_response["meta"]["id"], usuario_logado=auth_2)

        self.assertEqual(list_forbidden.exception.status_code, 403)
        self.assertEqual(delete_forbidden.exception.status_code, 403)
        self.assertEqual(goal_forbidden.exception.status_code, 403)
        self.assertEqual(
            transactions.listar_transacoes_logado(usuario_logado=auth_2)["total"],
            0
        )
        self.assertEqual(
            goals.listar_metas_logado(usuario_logado=auth_2)["total"],
            0
        )
        self.assertNotEqual(user_1, user_2)

    def test_missing_invalid_token_and_rollback(self):
        with self.assertRaises(HTTPException) as missing_token:
            verificar_token(None)

        with self.assertRaises(HTTPException) as invalid_token:
            verificar_token(HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials="token-invalido",
            ))

        self.assertEqual(missing_token.exception.status_code, 401)
        self.assertEqual(invalid_token.exception.status_code, 401)

        with self.assertRaises(IntegrityError):
            with database.transacao() as conn:
                conn.execute(insert(database.users_table).values(
                    nome="Rollback",
                    email="rollback@example.com",
                    senha="hash",
                ))
                conn.execute(insert(database.users_table).values(
                    nome="Rollback 2",
                    email="rollback@example.com",
                    senha="hash",
                ))

        usuario = database.executar_select_um(
            select(database.users_table.c.id).where(
                database.users_table.c.email == "rollback@example.com"
            )
        )
        self.assertIsNone(usuario)


class DatabaseSelectionTests(unittest.TestCase):
    def tearDown(self):
        restore_database_config()

    def test_development_without_database_url_uses_sqlite(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "dev.db"
            try:
                configure_temp_database(db_path)
                database.criar_tabelas()

                self.assertEqual(database.tipo_banco(), "sqlite")
                self.assertTrue(db_path.exists())

                migration = database.executar_select_um(
                    select(database.schema_migrations_table.c.id).where(
                        database.schema_migrations_table.c.nome
                        == database.MIGRATION_SUPABASE_RLS_SECURITY
                    )
                )
                self.assertIsNone(migration)
            finally:
                restore_database_config()

    def test_production_without_database_url_fails(self):
        database.configurar_banco_para_testes(
            database_url="",
            database_file="unused.db",
            environment="production",
        )

        with self.assertRaises(RuntimeError):
            database.criar_tabelas()


class CorsTests(unittest.TestCase):
    def test_register_preflight_allows_vercel_post(self):
        status_code, headers = asyncio.run(make_asgi_request(
            "OPTIONS",
            "/users/register",
            {
                "Origin": "https://eco-tree-ten.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        ))

        self.assertEqual(status_code, 200)
        self.assertEqual(
            headers.get("access-control-allow-origin"),
            "https://eco-tree-ten.vercel.app",
        )
        self.assertIn(
            "POST",
            headers.get("access-control-allow-methods", "").split(", "),
        )
        self.assertEqual(
            headers.get("access-control-allow-credentials"),
            "true",
        )
        self.assertIn(
            "content-type",
            headers.get("access-control-allow-headers", "").lower(),
        )

    def test_local_origins_are_defaults_only_in_development(self):
        development_origins = _resolve_allowed_origins("development", None)
        production_origins = _resolve_allowed_origins("production", None)

        self.assertIn("http://localhost:5173", development_origins)
        self.assertIn("http://127.0.0.1:5173", development_origins)
        self.assertNotIn("http://localhost:5173", production_origins)
        self.assertNotIn("http://127.0.0.1:5173", production_origins)
        self.assertEqual(production_origins, [
            "https://eco-tree-ten.vercel.app"
        ])

    def test_wildcard_origin_is_rejected_in_production(self):
        with self.assertRaises(RuntimeError):
            _resolve_allowed_origins("production", "*")


if __name__ == "__main__":
    unittest.main()
