import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { apiRequest } from "../services/api.js";

function getProfile(data) {
  return data?.usuario || data?.user || data || null;
}

function getDisplayName(profile) {
  const rawName = profile?.nome || profile?.name || profile?.email?.split("@")[0];
  const name = rawName || "Usuário EcoTree";

  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getInitials(profile) {
  const name = getDisplayName(profile).trim();
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.charAt(0).toUpperCase();
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
  const goals = goalsData?.metas || goalsData?.goals || [];
  return Array.isArray(goals) ? goals : [];
}

function getCompletedGoals(goalsData) {
  return getGoalsList(goalsData).filter((goal) =>
    String(goal.status || "").toLowerCase().includes("conclu")
  ).length;
}

export default function Profile({ onLogout, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [transactionsSummary, setTransactionsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partialErrors, setPartialErrors] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setPartialErrors([]);

      try {
        const [profileResult, treeResult, goalsResult, transactionsResult] =
          await Promise.allSettled([
            apiRequest("/users/me"),
            apiRequest("/tree/status"),
            apiRequest("/goals/"),
            apiRequest("/transactions/summary")
          ]);

        if (!active) {
          return;
        }

        if (profileResult.status === "rejected") {
          throw profileResult.reason;
        }

        setProfile(getProfile(profileResult.value));
        setTreeData(
          treeResult.status === "fulfilled" ? treeResult.value.arvore : null
        );
        setGoalsData(goalsResult.status === "fulfilled" ? goalsResult.value : null);
        setTransactionsSummary(
          transactionsResult.status === "fulfilled"
            ? transactionsResult.value
            : null
        );

        const sources = [
          { label: "árvore", result: treeResult },
          { label: "metas", result: goalsResult },
          { label: "registros", result: transactionsResult }
        ];

        setPartialErrors(
          sources
            .filter((source) => source.result.status === "rejected")
            .map((source) => source.label)
        );
      } catch (erro) {
        if (active) {
          setError(erro.message || "Não foi possível carregar o perfil.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const treeProgress = getTreeProgress(treeData);
  const goalsList = getGoalsList(goalsData);
  const completedGoals = getCompletedGoals(goalsData);
  const totalGoals = goalsData?.total ?? goalsList.length;
  const pointsToNextLevel = Number(treeData?.pontos_para_proximo_nivel || 0);

  const shortcuts = useMemo(
    () => [
      {
        id: "tree",
        icon: "♧",
        title: "Minha EcoTree",
        detail: "Ver nível, pontos e evolução",
        action: () => onNavigate("tree")
      },
      {
        id: "goals",
        icon: "◎",
        title: "Metas",
        detail: `${totalGoals || 0} meta${totalGoals === 1 ? "" : "s"} cadastrada${totalGoals === 1 ? "" : "s"}`,
        action: () => onNavigate("goals")
      },
      {
        id: "transactions",
        icon: "◈",
        title: "Registros",
        detail: `${transactionsSummary?.total_transacoes || 0} movimentações`,
        action: () => onNavigate("transactions")
      }
    ],
    [onNavigate, totalGoals, transactionsSummary?.total_transacoes]
  );

  return (
    <section
      className="page-section polished-page profile-v2-page"
      aria-labelledby="profile-title"
    >
      <header className="profile-cover">
        <div>
          <h1 id="profile-title">Perfil</h1>
          <p>Sua jornada verde em um só lugar</p>
        </div>
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
        <LoadingState>Carregando perfil...</LoadingState>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar seu perfil."
          actionLabel="Sair"
          onAction={onLogout}
        >
          Tente entrar novamente caso a sessão tenha expirado.
        </EmptyState>
      ) : (
        <>
          <article className="profile-identity-card">
            <div className="profile-avatar-xl" aria-hidden="true">
              {getInitials(profile)}
            </div>
            <h2>{getDisplayName(profile)}</h2>
            <p>{profile?.email || "Email não informado"}</p>
          </article>

          <article className="profile-level-card">
            <div className="list-heading-row">
              <div>
                <span className="eyebrow">Nível atual</span>
                <h2>
                  Nível {treeData?.nivel ?? "-"} ·{" "}
                  {treeData?.nome_nivel || "EcoTree"}
                </h2>
              </div>
            </div>
            <p>
              {treeData?.proximo_nivel
                ? `Você está a ${pointsToNextLevel} XP de alcançar ${treeData.proximo_nivel}.`
                : "Você chegou ao nível máximo disponível para sua EcoTree."}
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Progresso de nível"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={treeProgress}
            >
              <span style={{ width: `${treeProgress}%` }} />
            </div>
            <div className="profile-level-scale">
              <strong>{treeData?.pontos || 0} XP</strong>
              <span>
                {treeData?.proximo_nivel
                  ? `${Number(treeData?.pontos || 0) + pointsToNextLevel} XP`
                  : "Completo"}
              </span>
            </div>
          </article>

          <dl className="profile-metrics">
            <div>
              <dt>Pontos</dt>
              <dd>{treeData?.pontos || 0}</dd>
              <small>da árvore</small>
            </div>
            <div>
              <dt>Metas</dt>
              <dd>{totalGoals || 0}</dd>
              <small>{completedGoals} concluída{completedGoals === 1 ? "" : "s"}</small>
            </div>
            <div>
              <dt>Dias</dt>
              <dd>12</dd>
              <small>sequência</small>
            </div>
          </dl>

          <article className="profile-badge-card">
            <span aria-hidden="true">★</span>
            <div>
              <strong>Conquista recente</strong>
              <h2>Guardião Verde</h2>
              <p>Você manteve 12 dias de evolução.</p>
            </div>
          </article>

          <article className="polished-panel shortcuts-panel">
            <div className="list-heading-row">
              <div>
                <span className="eyebrow">Atalhos</span>
                <h2>Continuar jornada</h2>
              </div>
            </div>

            {shortcuts.length === 0 ? (
              <EmptyState title="Sem atalhos disponíveis.">
                Os acessos rápidos aparecerão quando a navegação estiver pronta.
              </EmptyState>
            ) : (
              <div className="profile-shortcuts">
                {shortcuts.map((shortcut) => (
                  <button
                    className="profile-shortcut"
                    key={shortcut.id}
                    type="button"
                    onClick={shortcut.action}
                  >
                    <span aria-hidden="true">{shortcut.icon}</span>
                    <span>
                      <strong>{shortcut.title}</strong>
                      <small>{shortcut.detail}</small>
                    </span>
                    <i aria-hidden="true">›</i>
                  </button>
                ))}

                <button
                  className="profile-shortcut logout"
                  type="button"
                  onClick={onLogout}
                >
                  <span aria-hidden="true">!</span>
                  <span>
                    <strong>Sair da conta</strong>
                    <small>Encerrar sessão neste dispositivo</small>
                  </span>
                  <i aria-hidden="true">›</i>
                </button>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
