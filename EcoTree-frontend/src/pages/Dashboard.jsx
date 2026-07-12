import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

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

export default function Dashboard({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState({
    tree: null,
    transactions: null,
    goals: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const profileData = await apiRequest("/users/me");

        if (active) {
          setProfile(profileData.usuario);
        }

        const [treeResult, transactionsResult, goalsResult] =
          await Promise.allSettled([
            apiRequest("/tree/status"),
            apiRequest("/transactions/summary"),
            apiRequest("/goals/user")
          ]);

        if (active) {
          setOverview({
            tree:
              treeResult.status === "fulfilled"
                ? treeResult.value.arvore
                : null,
            transactions:
              transactionsResult.status === "fulfilled"
                ? transactionsResult.value
                : null,
            goals:
              goalsResult.status === "fulfilled" ? goalsResult.value : null
          });
        }
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

  const cards = [
    {
      page: "tree",
      label: "Árvore",
      metric: overview.tree
        ? `${overview.tree.pontos || 0} pontos`
        : "Status da árvore",
      detail: overview.tree
        ? `Nível ${overview.tree.nivel} - ${overview.tree.nome_nivel}`
        : "Acompanhe o crescimento da sua EcoTree.",
      action: "Ver árvore"
    },
    {
      page: "transactions",
      label: "Transações",
      metric: overview.transactions
        ? formatCurrency(overview.transactions.saldo)
        : "Resumo financeiro",
      detail: overview.transactions
        ? `${overview.transactions.total_transacoes || 0} transações registradas`
        : "Organize entradas e saídas em um só lugar.",
      action: "Ver transações"
    },
    {
      page: "goals",
      label: "Metas",
      metric: overview.goals ? `${overview.goals.total || 0} metas` : "Progresso",
      detail: "Planeje objetivos e acompanhe cada avanço.",
      action: "Ver metas"
    }
  ];

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="section-heading">
          <span className="eyebrow">Dashboard</span>
          <h1>
            {loading
              ? "Preparando seu painel"
              : `Olá, ${getDisplayName(profile)}`}
          </h1>
          <p>
            Seu espaço para acompanhar a árvore, manter as finanças visíveis e
            transformar metas em pequenos avanços diários.
          </p>
        </div>

        <div className="hero-stat" aria-label="Sessão autenticada">
          <span>Sessão ativa</span>
          <strong>{profile?.email || "EcoTree"}</strong>
        </div>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <button
            key={card.page}
            type="button"
            className="feature-card"
            onClick={() => onNavigate(card.page)}
          >
            <span className="feature-label">{card.label}</span>
            <strong>{card.metric}</strong>
            <p>{card.detail}</p>
            <small>{card.action}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
