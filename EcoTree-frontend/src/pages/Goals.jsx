import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

const initialForm = {
  titulo: "",
  valor_meta: "",
  valor_atual: "",
  prazo: ""
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getGoalProgress(goal) {
  const progress = Number(goal?.progresso_percentual || 0);
  return Math.min(Math.max(progress, 0), 100);
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [userGoalsTotal, setUserGoalsTotal] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadGoals() {
    setLoading(true);
    setError("");

    try {
      const [allGoalsData, userGoalsData] = await Promise.all([
        apiRequest("/goals/"),
        apiRequest("/goals/user")
      ]);

      setGoals(allGoalsData.metas || []);
      setUserGoalsTotal(userGoalsData.total || 0);
    } catch (erro) {
      setError(erro.message || "Não foi possível carregar metas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        titulo: form.titulo,
        valor_meta: Number(form.valor_meta),
        valor_atual: Number(form.valor_atual),
        prazo: form.prazo
      };

      const data = await apiRequest("/goals/", {
        method: "POST",
        body: payload
      });

      setMessage(data.mensagem);
      setForm(initialForm);
      await loadGoals();
    } catch (erro) {
      setError(erro.message || "Não foi possível criar a meta.");
    } finally {
      setSaving(false);
    }
  }

  const completedGoals = goals.filter((goal) => goal.status === "concluída")
    .length;
  const activeGoals = Math.max(userGoalsTotal - completedGoals, 0);

  return (
    <section className="page-section">
      <div className="section-heading">
        <span className="eyebrow">Metas</span>
        <h1>Metas financeiras</h1>
        <p>
          Defina objetivos, registre o valor atual e acompanhe seu caminho até
          a conclusão.
        </p>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      <div className="content-grid">
        <article className="data-card">
          <h2>Nova meta</h2>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Título
              <input
                type="text"
                value={form.titulo}
                onChange={(event) => updateForm("titulo", event.target.value)}
                placeholder="Ex.: Reserva de emergência"
                minLength="3"
                required
              />
            </label>
            <label>
              Valor da meta
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor_meta}
                onChange={(event) =>
                  updateForm("valor_meta", event.target.value)
                }
                placeholder="0,00"
                required
              />
            </label>
            <label>
              Valor atual
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor_atual}
                onChange={(event) =>
                  updateForm("valor_atual", event.target.value)
                }
                placeholder="0,00"
                required
              />
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={form.prazo}
                onChange={(event) => updateForm("prazo", event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar meta"}
            </button>
          </form>
        </article>

        <article className="data-card">
          <h2>Resumo</h2>
          <dl className="metric-grid">
            <div className="metric-card">
              <dt>Total</dt>
              <dd>{userGoalsTotal}</dd>
            </div>
            <div className="metric-card positive">
              <dt>Concluídas</dt>
              <dd>{completedGoals}</dd>
            </div>
            <div className="metric-card">
              <dt>Em andamento</dt>
              <dd>{activeGoals}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="data-card">
        <h2>Lista de metas</h2>
        {loading ? (
          <p className="muted">Carregando metas...</p>
        ) : goals.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma meta cadastrada ainda.</strong>
            <p>Crie uma meta para acompanhar o progresso por aqui.</p>
          </div>
        ) : (
          <ul className="goal-list">
            {goals.map((goal) => (
              <li className="goal-item" key={goal.id}>
                <div className="goal-item-header">
                  <div>
                    <strong>{goal.titulo}</strong>
                    <span>
                      {formatCurrency(goal.valor_atual)} de{" "}
                      {formatCurrency(goal.valor_meta)}
                    </span>
                  </div>
                  <span className="pill">{goal.status}</span>
                </div>

                <div className="progress-block">
                  <div className="progress-label">
                    <span>Progresso</span>
                    <strong>{getGoalProgress(goal)}%</strong>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <span style={{ width: `${getGoalProgress(goal)}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
