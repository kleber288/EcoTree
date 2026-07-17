import { useEffect, useMemo, useState } from "react";
import TreeStageVisual from "../components/tree/TreeStageVisual.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { apiRequest } from "../services/api.js";
import { getTreeStage } from "../utils/treeStage.js";

function getDisplayName(profile) {
  const name = profile?.nome || profile?.email?.split("@")[0] || "usuário";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getGoalsList(goalsData) {
  return goalsData?.metas || goalsData?.goals || [];
}

function getActiveGoalsCount(goalsData) {
  const goals = getGoalsList(goalsData);

  if (goals.length > 0) {
    return goals.filter((goal) => {
      const status = String(goal.status || "").toLowerCase();
      return !status.includes("conclu");
    }).length;
  }

  return Number(goalsData?.total || 0);
}

function getLatestTransactions(transactionsData) {
  const transactions = transactionsData?.transacoes || transactionsData || [];

  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions.slice(0, 3);
}

function getTreeProgressCopy(stage) {
  if (!stage.proximoEstagio) {
    return "Estágio máximo alcançado.";
  }

  return `Faltam ${stage.pontosParaProximo} pontos para chegar ao estágio ${stage.proximoEstagio}.`;
}

export default function Dashboard({ currentUser, onNavigate }) {
  const [overview, setOverview] = useState({
    tree: null,
    transactions: null,
    goals: null,
    latestTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partialErrors, setPartialErrors] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      setPartialErrors([]);

      try {
        const [treeResult, transactionsResult, goalsResult, latestResult] =
          await Promise.allSettled([
            apiRequest("/tree/status"),
            apiRequest("/transactions/summary"),
            apiRequest("/goals/user"),
            apiRequest("/transactions/")
          ]);

        if (!active) {
          return;
        }

        const sources = [
          { label: "árvore", result: treeResult },
          { label: "transações", result: transactionsResult },
          { label: "metas", result: goalsResult },
          { label: "atividades", result: latestResult }
        ];

        setPartialErrors(
          sources
            .filter((source) => source.result.status === "rejected")
            .map((source) => source.label)
        );

        setOverview({
          tree:
            treeResult.status === "fulfilled"
              ? treeResult.value.arvore
              : null,
          transactions:
            transactionsResult.status === "fulfilled"
              ? transactionsResult.value
              : null,
          goals: goalsResult.status === "fulfilled" ? goalsResult.value : null,
          latestTransactions:
            latestResult.status === "fulfilled"
              ? getLatestTransactions(latestResult.value)
              : []
        });
      } catch (erro) {
        if (active) {
          setError(erro.message || "Não foi possível carregar seu painel.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const hasTreeData = Boolean(overview.tree);
  const treeStage = getTreeStage(overview.tree?.pontos);
  const activeGoals = getActiveGoalsCount(overview.goals);
  const latestTransactions = overview.latestTransactions;

  const lastActivities = useMemo(() => {
    const activities = [];

    if (overview.tree) {
      activities.push({
        id: "tree",
        title: `${treeStage.points} pontos acumulados`,
        detail: treeStage.proximoEstagio
          ? `Próximo estágio: ${treeStage.proximoEstagio}`
          : "EcoTree no estágio máximo.",
        time: "Agora"
      });
    }

    latestTransactions.forEach((transaction) => {
      activities.push({
        id: `transaction-${transaction.id}`,
        title: transaction.categoria || "Registro financeiro",
        detail: `${transaction.tipo === "gasto" ? "Saída" : "Entrada"} de ${formatCurrency(transaction.valor)}`,
        time: "Recente"
      });
    });

    if (overview.goals) {
      activities.push({
        id: "goals",
        title:
          activeGoals > 0
            ? `${activeGoals} meta${activeGoals === 1 ? "" : "s"} em andamento`
            : "Metas em dia",
        detail:
          activeGoals > 0
            ? "Continue atualizando seus objetivos."
            : "Crie uma nova meta para acompanhar seu avanço.",
        time: "Hoje"
      });
    }

    return activities.slice(0, 4);
  }, [activeGoals, latestTransactions, overview.goals, overview.tree, treeStage]);

  const hasAnyData =
    hasTreeData ||
    overview.transactions ||
    overview.goals ||
    latestTransactions.length > 0;

  const stats = [
    {
      label: "PONTOS",
      value: hasTreeData ? treeStage.points : "—",
      detail: hasTreeData ? "Total acumulado" : "Não carregado",
      tone: "green"
    },
    {
      label: "METAS ATIVAS",
      value: overview.goals ? activeGoals : "—",
      detail: overview.goals
        ? activeGoals > 0
          ? `${activeGoals} em andamento`
          : "Nenhuma em andamento"
        : "Não carregado",
      tone: "amber"
    },
    {
      label: "SALDO VERDE",
      value: overview.transactions ? formatCurrency(overview.transactions.saldo) : "—",
      detail: overview.transactions ? "Atualizado agora" : "Não carregado",
      tone: "blue"
    }
  ];

  return (
    <section
      className="page-section app-home dashboard-redesign"
      aria-labelledby="dashboard-title"
    >
      <header className="home-redesign-header">
        <span>{loading ? "Carregando..." : `Bom dia, ${getDisplayName(currentUser)}`}</span>
        <h1 id="dashboard-title">Sua EcoTree está crescendo</h1>
        <p>Continue sua jornada com pequenas ações hoje.</p>
      </header>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {partialErrors.length > 0 && !error && (
        <p className="alert error" role="alert">
          Algumas informações não carregaram agora: {partialErrors.join(", ")}.
        </p>
      )}

      {loading ? (
        <LoadingState>Carregando seu painel...</LoadingState>
      ) : !error ? (
        <>
          <div className="home-hero-grid">
            <article className="home-hero-tree-card">
              <div className="home-hero-tree-copy">
                <span>MINHA ÁRVORE</span>
                <h2>{hasTreeData ? treeStage.nome : "Árvore indisponível"}</h2>
                <p>
                  {hasTreeData
                    ? getTreeProgressCopy(treeStage)
                    : "Não foi possível carregar os dados da árvore agora."}
                </p>

                {hasTreeData && (
                  <div
                    className="home-hero-progress"
                    role="progressbar"
                    aria-label="Progresso da árvore"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={treeStage.progresso}
                  >
                    <span style={{ width: `${treeStage.progresso}%` }} />
                  </div>
                )}

                <small>
                  {hasTreeData
                    ? treeStage.proximoEstagio
                      ? `${treeStage.points} de ${treeStage.pontosProximoEstagio} pontos`
                      : `${treeStage.points} pontos acumulados`
                    : "Aguardando resposta da API"}
                </small>

                <button type="button" onClick={() => onNavigate("tree")}>
                  Ver árvore
                </button>
              </div>

              <TreeStageVisual
                stage={treeStage}
                variant="hero"
                className="home-hero-tree-visual"
              />
            </article>

            <article className="home-mission-card">
              <span>MISSÃO DO DIA</span>
              <h2>Registre uma ação sustentável hoje</h2>
              <p>
                Mantenha sua evolução ativa e ganhe progresso para sua árvore.
              </p>
              <button type="button" onClick={() => onNavigate("transactions")}>
                Fazer agora
              </button>
            </article>
          </div>

          {!hasAnyData && (
            <EmptyState
              title="Ainda não há dados no painel."
              actionLabel="Criar registro"
              onAction={() => onNavigate("transactions")}
            >
              Registre pontos, metas ou transações para preencher sua Home.
            </EmptyState>
          )}

          <div className="home-stat-grid" aria-label="Resumo do painel">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
                tone={stat.tone}
              />
            ))}
          </div>

          <div className="home-actions-activity-grid">
            <section className="home-quick-actions" aria-labelledby="quick-actions-title">
              <h2 id="quick-actions-title">Ações rápidas</h2>

              <div className="home-quick-action-list">
                <button
                  className="home-quick-action home-quick-action-tree"
                  type="button"
                  onClick={() => onNavigate("tree")}
                >
                  <strong>Adicionar pontos</strong>
                  <span>Atualize a evolução da árvore</span>
                  <small aria-hidden="true">→</small>
                </button>
                <button
                  className="home-quick-action home-quick-action-record"
                  type="button"
                  onClick={() => onNavigate("transactions")}
                >
                  <strong>Novo registro</strong>
                  <span>Organize suas movimentações</span>
                  <small aria-hidden="true">→</small>
                </button>
                <button
                  className="home-quick-action home-quick-action-goal"
                  type="button"
                  onClick={() => onNavigate("goals")}
                >
                  <strong>Criar meta</strong>
                  <span>Defina um novo objetivo</span>
                  <small aria-hidden="true">→</small>
                </button>
              </div>
            </section>

            <article className="home-activity-card">
              <h2>Últimas atividades</h2>
              {lastActivities.length === 0 ? (
                <EmptyState title="Nada por aqui ainda.">
                  Suas próximas ações, metas e registros aparecerão nesta lista.
                </EmptyState>
              ) : (
                <ul className="home-activity-list">
                  {lastActivities.map((activity) => (
                    <li key={activity.id}>
                      <span className="home-activity-marker" aria-hidden="true" />
                      <div>
                        <strong>{activity.title}</strong>
                        <span>{activity.detail}</span>
                      </div>
                      <small>{activity.time}</small>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
