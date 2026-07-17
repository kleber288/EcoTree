from fastapi import HTTPException
from sqlalchemy import func, insert, select, update
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

from database import (
    goals_table,
    transactions_table,
    transacao,
    tree_status_table,
    users_table,
    valor_monetario,
    executar_select_um,
)


def verificar_usuario_existe(user_id: int, conn: Connection | None = None):
    statement = select(
        users_table.c.id,
        users_table.c.nome,
        users_table.c.email,
    ).where(users_table.c.id == user_id)

    if conn is None:
        usuario = executar_select_um(statement)
    else:
        row = conn.execute(statement).mappings().first()
        usuario = dict(row) if row is not None else None

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


def _select_arvore():
    return select(
        tree_status_table.c.id,
        tree_status_table.c.user_id,
        tree_status_table.c.pontos,
        tree_status_table.c.pontos_manuais,
        tree_status_table.c.pontos_automaticos,
        tree_status_table.c.nivel,
        tree_status_table.c.nome_nivel,
    )


def _buscar_ou_criar_arvore_na_transacao(conn: Connection, user_id: int):
    row = conn.execute(
        _select_arvore().where(tree_status_table.c.user_id == user_id)
    ).mappings().first()

    if row is None:
        conn.execute(insert(tree_status_table).values(user_id=user_id))
        row = conn.execute(
            _select_arvore().where(tree_status_table.c.user_id == user_id)
        ).mappings().first()

    return dict(row)


def buscar_ou_criar_arvore(user_id: int):
    with transacao() as conn:
        verificar_usuario_existe(user_id, conn=conn)
        return _buscar_ou_criar_arvore_na_transacao(conn, user_id)


def montar_resposta_arvore(arvore):
    pontos = int(arvore["pontos"] or 0)
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


def _atualizar_componentes_arvore(
    conn: Connection,
    arvore_id: int,
    pontos_manuais: int,
    pontos_automaticos: int
):
    pontos_totais = pontos_manuais + pontos_automaticos
    dados_nivel = calcular_nivel(pontos_totais)

    conn.execute(
        update(tree_status_table)
        .where(tree_status_table.c.id == arvore_id)
        .values(
            pontos_manuais=pontos_manuais,
            pontos_automaticos=pontos_automaticos,
            pontos=pontos_totais,
            nivel=dados_nivel["nivel"],
            nome_nivel=dados_nivel["nome_nivel"],
        )
    )


def adicionar_pontos_manuais_arvore(user_id: int, pontos_adicionados: int):
    try:
        with transacao() as conn:
            verificar_usuario_existe(user_id, conn=conn)
            arvore = _buscar_ou_criar_arvore_na_transacao(conn, user_id)
            pontos_manuais = int(arvore["pontos_manuais"] or 0) + pontos_adicionados
            pontos_automaticos = int(arvore["pontos_automaticos"] or 0)

            _atualizar_componentes_arvore(
                conn,
                arvore["id"],
                pontos_manuais,
                pontos_automaticos
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao adicionar pontos na árvore."
        )

    return buscar_ou_criar_arvore(user_id)


def atualizar_pontos_automaticos_arvore(user_id: int, pontos_automaticos: int):
    try:
        with transacao() as conn:
            verificar_usuario_existe(user_id, conn=conn)
            arvore = _buscar_ou_criar_arvore_na_transacao(conn, user_id)
            pontos_manuais = int(arvore["pontos_manuais"] or 0)

            _atualizar_componentes_arvore(
                conn,
                arvore["id"],
                pontos_manuais,
                pontos_automaticos
            )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar árvore."
        )

    return buscar_ou_criar_arvore(user_id)


def atualizar_arvore_no_banco(user_id: int, pontos: int):
    return atualizar_pontos_automaticos_arvore(user_id, pontos)


def atualizar_arvore_total_no_banco(user_id: int, pontos: int):
    return atualizar_pontos_automaticos_arvore(user_id, pontos)


def _scalar_number(conn: Connection, statement):
    value = conn.execute(statement).scalar_one()
    return value or 0


def calcular_pontos_usuario(user_id: int):
    with transacao() as conn:
        verificar_usuario_existe(user_id, conn=conn)

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

    pontos_por_metas = int(metas_concluidas) * 10
    pontos_por_transacoes = int(total_transacoes) * 1

    pontos_totais = pontos_por_saldo + pontos_por_metas + pontos_por_transacoes

    return {
        "total_ganhos": valor_monetario(total_ganhos),
        "total_gastos": valor_monetario(total_gastos),
        "saldo": valor_monetario(saldo),
        "total_transacoes": int(total_transacoes),
        "metas_concluidas": int(metas_concluidas),
        "pontos_por_saldo": pontos_por_saldo,
        "pontos_por_metas": pontos_por_metas,
        "pontos_por_transacoes": pontos_por_transacoes,
        "pontos_totais": pontos_totais
    }


def recalcular_arvore_usuario(user_id: int):
    buscar_ou_criar_arvore(user_id)

    calculo = calcular_pontos_usuario(user_id)
    pontos_totais = calculo["pontos_totais"]

    atualizar_pontos_automaticos_arvore(user_id, pontos_totais)

    arvore_atualizada = buscar_ou_criar_arvore(user_id)

    return {
        "calculo": calculo,
        "arvore": montar_resposta_arvore(arvore_atualizada)
    }
