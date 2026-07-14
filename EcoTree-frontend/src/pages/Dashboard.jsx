import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { apiRequest } from "../services/api.js";

function getDisplayName(profile) {
  const name = profile?.nome || profile?.email?.split("@")[0] || "usuário";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getInitial(profile) {
  return getDisplayName(profile).charAt(0).toUpperCase();
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getTreeProgress(treeData) {
  const points = Number(treeData?.pontos || 0);
  const remaining = Number(treeData?.pontos_para_proximo_nivel || 0);
  const target = points + remaining;

  if (!treeData?.proximo_nivel || target <= 0) {
    return 100;
  }

  return Math.min(Math.round((points / target) * 100), 100);
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

export default function Dashboard({ onNavigate }) {
  const [profile, setProfile] = useState(null);
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
        const profileData = await apiRequest("/users/me");

        if (active) {
          setProfile(profileData.usuario);
        }

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
          setError(erro.message || "Não foi possível carregar o usuário.");
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

  const treeProgress = getTreeProgress(overview.tree);
  const activeGoals = getActiveGoalsCount(overview.goals);
  const latestTransactions = overview.latestTransactions;

  const lastActivities = useMemo(() => {
    const activities = [];

    if (overview.tree) {
      activities.push({
        id: "tree",
        icon: "♧",
        title: `${overview.tree.pontos || 0} XP acumulados`,
        detail: overview.tree.proximo_nivel
          ? `Faltam ${overview.tree.pontos_para_proximo_nivel || 0} pontos para ${overview.tree.proximo_nivel}.`
          : "EcoTree no nível máximo."
      });
    }

    latestTransactions.forEach((transaction) => {
      activities.push({
        id: `transaction-${transaction.id}`,
        icon: transaction.tipo === "gasto" ? "−" : "+",
        title: transaction.categoria || "Registro financeiro",
        detail: `${transaction.tipo === "gasto" ? "Saída" : "Entrada"} de ${formatCurrency(transaction.valor)}`
      });
    });

    if (overview.goals) {
      activities.push({
        id: "goals",
        icon: "◎",
        title:
          activeGoals > 0
            ? `${activeGoals} meta${activeGoals === 1 ? "" : "s"} em andamento`
            : "Metas em dia",
        detail:
          activeGoals > 0
            ? "Continue atualizando seus objetivos."
            : "Crie uma nova meta para acompanhar seu avanço."
      });
    }

    return activities.slice(0, 4);
  }, [activeGoals, latestTransactions, overview.goals, overview.tree]);

  const hasAnyData =
    overview.tree ||
    overview.transactions ||
    overview.goals ||
    latestTransactions.length > 0;

  return (
    <section className="page-section app-home" aria-labelledby="dashboard-title">
      <div className="home-top">
        <div>
          <span className="home-kicker">
            {loading ? "Carregando..." : `Bom dia, ${getDisplayName(profile)}`}
          </span>
          <h1 id="dashboard-title">Sua EcoTree está crescendo hoje</h1>
        </div>

        <div className="profile-avatar" aria-label="Usuário logado">
          {profile ? getInitial(profile) : "E"}
        </div>
      </div>

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
          <article className="home-tree-card">
            <div className="home-tree-copy">
              <span>Minha árvore</span>
              <h2>
                Nível {overview.tree?.nivel ?? "-"} ·{" "}
                {overview.tree?.nome_nivel || "Semente"}
              </h2>
              <p>
                {overview.tree?.proximo_nivel
                  ? `Faltam ${overview.tree.pontos_para_proximo_nivel || 0} pontos para ${overview.tree.proximo_nivel}.`
                  : "Sua árvore está no estágio máximo disponível."}
              </p>

              <div
                className="home-progress"
                role="progressbar"
                aria-label="Progresso da árvore"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={treeProgress}
              >
                <div className="home-progress-track">
                  <span style={{ width: `${treeProgress}%` }} />
                </div>
                <strong>
                  {overview.tree?.pontos || 0} XP · {treeProgress}%
                </strong>
              </div>
            </div>

            <div className="mini-tree-scene" aria-hidden="true">
              <span className="mini-tree-island" />
              <span className="mini-tree-trunk" />
              <span className="mini-tree-leaf mini-tree-leaf-one" />
              <span className="mini-tree-leaf mini-tree-leaf-two" />
              <span className="mini-tree-leaf mini-tree-leaf-three" />
              <span className="mini-tree-leaf mini-tree-leaf-four" />
            </div>

            <button
              className="home-card-action"
              type="button"
              onClick={() => onNavigate("tree")}
            >
              Ver árvore
            </button>
          </article>

          {!hasAnyData && (
            <EmptyState
              title="Ainda não há dados no painel."
              actionLabel="Criar registro"
              onAction={() => onNavigate("transactions")}
            >
              Registre pontos, metas ou transações para preencher sua Home.
            </EmptyState>
          )}

          <div className="home-metric-row" aria-label="Resumo do painel">
            <article className="home-metric-card">
              <span className="home-metric-icon amber" aria-hidden="true">✦</span>
              <strong>{overview.tree?.pontos || 0}</strong>
              <small>pontos</small>
            </article>
            <article className="home-metric-card">
              <span className="home-metric-icon green" aria-hidden="true">◎</span>
              <strong>{activeGoals}</strong>
              <small>metas ativas</small>
            </article>
            <article className="home-metric-card">
              <span className="home-metric-icon blue" aria-hidden="true">$</span>
              <strong>{formatCurrency(overview.transactions?.saldo)}</strong>
              <small>saldo verde</small>
            </article>
          </div>

          <div className="home-section-title">
            <h2>Ações rápidas</h2>
          </div>

          <div className="quick-actions-grid">
            <button
              className="quick-action quick-action-tree"
              type="button"
              onClick={() => onNavigate("tree")}
            >
              <span aria-hidden="true">+</span>
              <strong>Árvore</strong>
            </button>
            <button
              className="quick-action quick-action-goal"
              type="button"
              onClick={() => onNavigate("goals")}
            >
              <span aria-hidden="true">◎</span>
              <strong>Metas</strong>
            </button>
            <button
              className="quick-action quick-action-record"
              type="button"
              onClick={() => onNavigate("transactions")}
            >
              <span aria-hidden="true">$</span>
              <strong>Registros</strong>
            </button>
          </div>

          <article className="daily-mission-card">
            <span className="mission-icon" aria-hidden="true">
              ♻
            </span>
            <div>
              <h2>Missão de hoje</h2>
              <p>Registre uma ação sustentável e mantenha sua evolução ativa.</p>
            </div>
            <button type="button" onClick={() => onNavigate("transactions")}>
              Fazer
            </button>
          </article>

          <div className="home-summary-grid">
            <article className="data-card compact-card">
              <h2>Resumo de metas</h2>
              {overview.goals ? (
                <dl className="compact-stats">
                  <div>
                    <dt>Total</dt>
                    <dd>{overview.goals.total ?? getGoalsList(overview.goals).length}</dd>
                  </div>
                  <div>
                    <dt>Ativas</dt>
                    <dd>{activeGoals}</dd>
                  </div>
                </dl>
              ) : (
                <EmptyState title="Sem metas carregadas.">
                  A seção será preenchida quando a API retornar suas metas.
                </EmptyState>
              )}
            </article>

            <article className="data-card compact-card">
              <h2>Resumo de registros</h2>
              {overview.transactions ? (
                <dl className="compact-stats">
                  <div>
                    <dt>Saldo</dt>
                    <dd>{formatCurrency(overview.transactions.saldo)}</dd>
                  </div>
                  <div>
                    <dt>Registros</dt>
                    <dd>{overview.transactions.total_transacoes || 0}</dd>
                  </div>
                </dl>
              ) : (
                <EmptyState title="Sem registros carregados.">
                  O resumo aparece quando houver resposta das transações.
                </EmptyState>
              )}
            </article>
          </div>

          <article className="data-card activity-card">
            <h2>Últimas atividades</h2>
            {lastActivities.length === 0 ? (
              <EmptyState title="Nada por aqui ainda.">
                Suas próximas ações, metas e registros aparecerão nesta lista.
              </EmptyState>
            ) : (
              <ul className="activity-list">
                {lastActivities.map((activity) => (
                  <li key={activity.id}>
                    <span aria-hidden="true">{activity.icon}</span>
                    <div>
                      <strong>{activity.title}</strong>
                      <small>{activity.detail}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}
