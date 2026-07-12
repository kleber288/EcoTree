import sqlite3
from fastapi import HTTPException

from database import conectar


def verificar_usuario_existe(user_id: int):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nome, email
        FROM users
        WHERE id = ?
    """, (user_id,))

    usuario = cursor.fetchone()
    conn.close()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado."
        )

    return usuario


def calcular_nivel(pontos: int):
    if pontos < 10:
        return {
            "nivel": 1,
            "nome_nivel": "Semente",
            "proximo_nivel": "Broto",
            "pontos_proximo_nivel": 10
        }

    elif pontos < 25:
        return {
            "nivel": 2,
            "nome_nivel": "Broto",
            "proximo_nivel": "Muda",
            "pontos_proximo_nivel": 25
        }

    elif pontos < 50:
        return {
            "nivel": 3,
            "nome_nivel": "Muda",
            "proximo_nivel": "Árvore pequena",
            "pontos_proximo_nivel": 50
        }

    elif pontos < 100:
        return {
            "nivel": 4,
            "nome_nivel": "Árvore pequena",
            "proximo_nivel": "Árvore grande",
            "pontos_proximo_nivel": 100
        }

    elif pontos < 200:
        return {
            "nivel": 5,
            "nome_nivel": "Árvore grande",
            "proximo_nivel": "Floresta",
            "pontos_proximo_nivel": 200
        }

    else:
        return {
            "nivel": 6,
            "nome_nivel": "Floresta",
            "proximo_nivel": None,
            "pontos_proximo_nivel": None
        }


def buscar_ou_criar_arvore(user_id: int):
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_id, pontos, nivel, nome_nivel
        FROM tree_status
        WHERE user_id = ?
    """, (user_id,))

    arvore = cursor.fetchone()

    if arvore is None:
        cursor.execute("""
            INSERT INTO tree_status (user_id, pontos, nivel, nome_nivel)
            VALUES (?, ?, ?, ?)
        """, (user_id, 0, 1, "Semente"))

        conn.commit()

        cursor.execute("""
            SELECT id, user_id, pontos, nivel, nome_nivel
            FROM tree_status
            WHERE user_id = ?
        """, (user_id,))

        arvore = cursor.fetchone()

    conn.close()
    return arvore


def montar_resposta_arvore(arvore):
    pontos = arvore["pontos"]
    dados_nivel = calcular_nivel(pontos)

    pontos_proximo_nivel = dados_nivel["pontos_proximo_nivel"]

    if pontos_proximo_nivel is None:
        pontos_restantes = 0
    else:
        pontos_restantes = max(pontos_proximo_nivel - pontos, 0)

    return {
        "id": arvore["id"],
        "user_id": arvore["user_id"],
        "pontos": pontos,
        "nivel": dados_nivel["nivel"],
        "nome_nivel": dados_nivel["nome_nivel"],
        "proximo_nivel": dados_nivel["proximo_nivel"],
        "pontos_para_proximo_nivel": pontos_restantes
    }


def atualizar_arvore_no_banco(user_id: int, pontos: int):
    dados_nivel = calcular_nivel(pontos)

    conn = conectar()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE tree_status
            SET pontos = ?, nivel = ?, nome_nivel = ?
            WHERE user_id = ?
        """, (
            pontos,
            dados_nivel["nivel"],
            dados_nivel["nome_nivel"],
            user_id
        ))

        conn.commit()

    except sqlite3.Error as erro:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao atualizar árvore: {erro}"
        )

    finally:
        conn.close()


def calcular_pontos_usuario(user_id: int):
    verificar_usuario_existe(user_id)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COALESCE(SUM(valor), 0) AS total_ganhos
        FROM transactions
        WHERE user_id = ? AND tipo = 'ganho'
    """, (user_id,))

    total_ganhos = cursor.fetchone()["total_ganhos"]

    cursor.execute("""
        SELECT COALESCE(SUM(valor), 0) AS total_gastos
        FROM transactions
        WHERE user_id = ? AND tipo = 'gasto'
    """, (user_id,))

    total_gastos = cursor.fetchone()["total_gastos"]

    cursor.execute("""
        SELECT COUNT(*) AS total_transacoes
        FROM transactions
        WHERE user_id = ?
    """, (user_id,))

    total_transacoes = cursor.fetchone()["total_transacoes"]

    cursor.execute("""
        SELECT COUNT(*) AS metas_concluidas
        FROM goals
        WHERE user_id = ? AND status = 'concluída'
    """, (user_id,))

    metas_concluidas = cursor.fetchone()["metas_concluidas"]

    conn.close()

    saldo = total_ganhos - total_gastos

    pontos_por_saldo = 0

    if saldo > 0:
        pontos_por_saldo = int(saldo // 50) * 5

    pontos_por_metas = metas_concluidas * 10
    pontos_por_transacoes = total_transacoes * 1

    pontos_totais = pontos_por_saldo + pontos_por_metas + pontos_por_transacoes

    return {
        "total_ganhos": total_ganhos,
        "total_gastos": total_gastos,
        "saldo": saldo,
        "total_transacoes": total_transacoes,
        "metas_concluidas": metas_concluidas,
        "pontos_por_saldo": pontos_por_saldo,
        "pontos_por_metas": pontos_por_metas,
        "pontos_por_transacoes": pontos_por_transacoes,
        "pontos_totais": pontos_totais
    }


def recalcular_arvore_usuario(user_id: int):
    buscar_ou_criar_arvore(user_id)

    calculo = calcular_pontos_usuario(user_id)
    pontos_totais = calculo["pontos_totais"]

    atualizar_arvore_no_banco(user_id, pontos_totais)

    arvore_atualizada = buscar_ou_criar_arvore(user_id)

    return {
        "calculo": calculo,
        "arvore": montar_resposta_arvore(arvore_atualizada)
    }