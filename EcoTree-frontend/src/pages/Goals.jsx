import { useEffect, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
  updateGoalProgress
} from "../services/api.js";

const initialForm = {
  titulo: "",
  valor_meta: "",
  valor_atual: "",
  prazo: ""
};

const goalAccentClasses = ["green", "amber", "blue"];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatCompactCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
}

function formatDate(value) {
  if (!value) {
    return "Sem prazo";
  }

  const normalizedValue =
    typeof value === "string" && value.length === 10
      ? `${value}T00:00:00`
      : value;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getGoalProgress(goal) {
  const progress = Number(goal?.progresso_percentual || 0);
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

function getGoalStatus(goal) {
  const status = String(goal?.status || "").trim();

  if (status) {
    return status;
  }

  return getGoalProgress(goal) >= 100 ? "Concluída" : "Em andamento";
}

function getStatusTone(goal) {
  const status = getGoalStatus(goal).toLowerCase();

  if (status.includes("conclu") || getGoalProgress(goal) >= 100) {
    return "done";
  }

  if (status.includes("atras") || status.includes("pend")) {
    return "warning";
  }

  return "active";
}

function getGoalIcon(goal, index) {
  const title = String(goal?.titulo || "").toLowerCase();

  if (title.includes("transporte") || title.includes("caminh")) {
    return "GO";
  }

  if (title.includes("%") || title.includes("desperd")) {
    return "%";
  }

  return index === 2 ? "GO" : "R$";
}

export default function Goals() {
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [userGoalsTotal, setUserGoalsTotal] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [progressValues, setProgressValues] = useState({});
  const [progressErrors, setProgressErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressSavingId, setProgressSavingId] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(null);
  const [error, setError] = useState("");

  async function loadGoals() {
    setLoading(true);
    setError("");

    try {
      const allGoalsData = await getGoals();
      const loadedGoals = allGoalsData.metas || [];

      setGoals(loadedGoals);
      setUserGoalsTotal(allGoalsData.total ?? loadedGoals.length);
    } catch (erro) {
      setError(erro.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function clearFormError(field) {
    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    clearFormError(field);
  }

  function buildPayload() {
    return {
      titulo: form.titulo.trim(),
      valor_meta: Number(form.valor_meta),
      valor_atual: Number(form.valor_atual),
      prazo: form.prazo || null
    };
  }

  function resetForm() {
    setForm(initialForm);
    setEditingGoalId(null);
    setFormErrors({});
  }

  function openNewGoalForm() {
    resetForm();
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function startEditing(goal) {
    setEditingGoalId(goal.id);
    setShowForm(true);
    setFormErrors({});
    setError("");
    setForm({
      titulo: goal.titulo || "",
      valor_meta: String(goal.valor_meta ?? ""),
      valor_atual: String(goal.valor_atual ?? ""),
      prazo: goal.prazo || ""
    });
  }

  function updateProgressValue(goalId, value) {
    setProgressValues((current) => ({
      ...current,
      [goalId]: value
    }));
    setProgressErrors((current) => {
      if (!current[goalId]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[goalId];
      return nextErrors;
    });
  }

  function validateGoalForm() {
    const errors = {};
    const targetValue = Number(form.valor_meta);
    const currentValue = Number(form.valor_atual);

    if (!form.titulo.trim()) {
      errors.titulo = "Informe o título da meta.";
    } else if (form.titulo.trim().length < 3) {
      errors.titulo = "Use pelo menos 3 caracteres.";
    }

    if (String(form.valor_meta).trim() === "") {
      errors.valor_meta = "Informe o valor da meta.";
    } else if (!Number.isFinite(targetValue)) {
      errors.valor_meta = "Use um valor numérico válido.";
    } else if (targetValue <= 0) {
      errors.valor_meta = "O valor da meta precisa ser maior que zero.";
    }

    if (String(form.valor_atual).trim() === "") {
      errors.valor_atual = "Informe o valor atual.";
    } else if (!Number.isFinite(currentValue)) {
      errors.valor_atual = "Use um valor numérico válido.";
    } else if (currentValue < 0) {
      errors.valor_atual = "O valor atual não pode ser negativo.";
    }

    return errors;
  }

  function validateProgress(goalId) {
    const value = Number(progressValues[goalId]);

    if (String(progressValues[goalId] || "").trim() === "") {
      return "Informe um valor para adicionar ao progresso.";
    }

    if (!Number.isFinite(value)) {
      return "Use um valor numérico válido.";
    }

    if (value <= 0) {
      return "O progresso precisa ser maior que zero.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const errors = validateGoalForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning("Revise os campos destacados antes de salvar.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();

      if (editingGoalId) {
        await updateGoal(editingGoalId, payload);
        toast.success("Meta atualizada com sucesso.");
      } else {
        await createGoal(payload);
        toast.success("Meta criada com sucesso.");
      }

      closeForm();
      await loadGoals();
    } catch (erro) {
      toast.error(
        erro.message ||
          (editingGoalId
            ? "Não foi possível atualizar a meta."
            : "Não foi possível criar a meta.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleProgressSubmit(event, goalId) {
    event.preventDefault();
    const progressError = validateProgress(goalId);

    if (progressSavingId) {
      return;
    }

    if (progressError) {
      setProgressErrors((current) => ({
        ...current,
        [goalId]: progressError
      }));
      toast.warning("Revise o valor de progresso antes de atualizar.");
      return;
    }

    const value = Number(progressValues[goalId]);

    setProgressSavingId(goalId);
    setError("");

    try {
      await updateGoalProgress(goalId, value);
      toast.success("Progresso atualizado com sucesso.");
      updateProgressValue(goalId, "");
      await loadGoals();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível atualizar o progresso.");
    } finally {
      setProgressSavingId(null);
    }
  }

  async function handleDeleteGoal(goal) {
    setPendingDeleteGoal(goal);
  }

  async function confirmDeleteGoal() {
    if (!pendingDeleteGoal || deletingGoalId) {
      return;
    }

    setDeletingGoalId(pendingDeleteGoal.id);
    setError("");

    try {
      await deleteGoal(pendingDeleteGoal.id);
      toast.success("Meta excluída com sucesso.");

      if (editingGoalId === pendingDeleteGoal.id) {
        closeForm();
      }

      setPendingDeleteGoal(null);
      await loadGoals();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível excluir a meta.");
    } finally {
      setDeletingGoalId(null);
    }
  }

  const completedGoals = goals.filter((goal) =>
    getGoalStatus(goal).toLowerCase().includes("conclu")
  ).length;
  const totalGoals = userGoalsTotal || goals.length;
  const activeGoals = Math.max(totalGoals - completedGoals, 0);
  const averageProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((total, goal) => total + getGoalProgress(goal), 0) /
            goals.length
        )
      : 0;
  const totalCurrent = goals.reduce(
    (total, goal) => total + Number(goal.valor_atual || 0),
    0
  );
  const totalTarget = goals.reduce(
    (total, goal) => total + Number(goal.valor_meta || 0),
    0
  );

  return (
    <section
      className="page-section polished-page goals-v2-page"
      aria-labelledby="goals-title"
    >
      <header className="polished-header">
        <div>
          <span className="eyebrow">Metas verdes</span>
          <h1 id="goals-title">Metas</h1>
          <p>
            Acompanhe objetivos e transforme progresso em evolução para sua
            EcoTree.
          </p>
        </div>

        <button
          className="pill-action"
          type="button"
          onClick={openNewGoalForm}
          aria-controls="goal-form-panel"
          aria-expanded={showForm}
        >
          + Nova
        </button>
      </header>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <article
          className="polished-panel form-panel"
          id="goal-form-panel"
          aria-labelledby="goal-form-title"
        >
          <div className="form-card-header">
            <div>
              <span className="eyebrow">
                {editingGoalId ? "Edição" : "Nova meta"}
              </span>
              <h2 id="goal-form-title">
                {editingGoalId ? "Editar meta" : "Criar nova meta"}
              </h2>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>

          <form
            className="stack-form polished-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <label htmlFor="goal-titulo">
              Título
              <input
                id="goal-titulo"
                type="text"
                value={form.titulo}
                onChange={(event) => updateForm("titulo", event.target.value)}
                placeholder="Ex.: Reserva de emergência"
                minLength="3"
                aria-invalid={Boolean(formErrors.titulo)}
                aria-describedby={
                  formErrors.titulo ? "goal-titulo-error" : undefined
                }
                required
              />
              <FormError id="goal-titulo-error">
                {formErrors.titulo}
              </FormError>
            </label>

            <div className="form-two-columns">
              <label htmlFor="goal-valor-meta">
                Valor da meta
                <input
                  id="goal-valor-meta"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor_meta}
                  onChange={(event) =>
                    updateForm("valor_meta", event.target.value)
                  }
                  placeholder="0,00"
                  aria-invalid={Boolean(formErrors.valor_meta)}
                  aria-describedby={
                    formErrors.valor_meta ? "goal-valor-meta-error" : undefined
                  }
                  required
                />
                <FormError id="goal-valor-meta-error">
                  {formErrors.valor_meta}
                </FormError>
              </label>
              <label htmlFor="goal-valor-atual">
                Valor atual
                <input
                  id="goal-valor-atual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_atual}
                  onChange={(event) =>
                    updateForm("valor_atual", event.target.value)
                  }
                  placeholder="0,00"
                  aria-invalid={Boolean(formErrors.valor_atual)}
                  aria-describedby={
                    formErrors.valor_atual ? "goal-valor-atual-error" : undefined
                  }
                  required
                />
                <FormError id="goal-valor-atual-error">
                  {formErrors.valor_atual}
                </FormError>
              </label>
            </div>

            <label htmlFor="goal-prazo">
              Prazo
              <input
                id="goal-prazo"
                type="date"
                value={form.prazo}
                onChange={(event) => updateForm("prazo", event.target.value)}
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving
                ? editingGoalId
                  ? "Atualizando..."
                  : "Salvando..."
                : editingGoalId
                  ? "Atualizar meta"
                  : "Criar meta"}
            </button>
          </form>
        </article>
      )}

      {loading ? (
        <LoadingState>Carregando metas...</LoadingState>
      ) : (
        <>
      <article className="summary-hero-card goals-summary-hero">
        <div>
          <span>Progresso geral</span>
          <strong>{averageProgress}%</strong>
          <p>
            {activeGoals} em andamento · {completedGoals} concluída
            {completedGoals === 1 ? "" : "s"}
          </p>
        </div>
        <div className="hero-medal" aria-hidden="true">
          ✓
        </div>
        <div className="summary-progress">
          <span style={{ width: `${averageProgress}%` }} />
        </div>
      </article>

      <dl className="metric-strip">
        <div className="metric-tile">
          <dt>Ativas</dt>
          <dd>{String(activeGoals).padStart(2, "0")}</dd>
        </div>
        <div className="metric-tile positive">
          <dt>Concluídas</dt>
          <dd>{String(completedGoals).padStart(2, "0")}</dd>
        </div>
        <div className="metric-tile amber">
          <dt>Guardado</dt>
          <dd>{formatCompactCurrency(totalCurrent)}</dd>
        </div>
      </dl>

      <article className="polished-panel list-panel">
        <div className="list-heading-row">
          <div>
            <span className="eyebrow">Objetivos</span>
            <h2>Metas em destaque</h2>
          </div>
          <span className="soft-count">
            {formatCompactCurrency(totalCurrent)} / {formatCompactCurrency(totalTarget)}
          </span>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            title="Nenhuma meta cadastrada ainda."
            actionLabel="Criar meta"
            onAction={openNewGoalForm}
          >
            Crie uma meta para acompanhar seu progresso por aqui.
          </EmptyState>
        ) : (
          <ul className="goal-cards-grid">
            {goals.map((goal, index) => {
              const progress = getGoalProgress(goal);
              const accent = goalAccentClasses[index % goalAccentClasses.length];
              const statusTone = getStatusTone(goal);

              return (
                <li className={`goal-card-v2 accent-${accent}`} key={goal.id}>
                  <div className="goal-card-top">
                    <span className="round-icon" aria-hidden="true">
                      {getGoalIcon(goal, index)}
                    </span>
                    <div className="goal-card-title">
                      <strong>{goal.titulo}</strong>
                      <span>
                        {formatCurrency(goal.valor_atual)} de{" "}
                        {formatCurrency(goal.valor_meta)}
                      </span>
                    </div>
                    <strong className="goal-card-value">{progress}%</strong>
                  </div>

                  <div className="goal-card-meta">
                    <span className={`status-pill ${statusTone}`}>
                      {getGoalStatus(goal)}
                    </span>
                    <span className="deadline-chip">
                      Prazo: {formatDate(goal.prazo)}
                    </span>
                  </div>

                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label={`Progresso de ${goal.titulo}`}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={progress}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <form
                    className="inline-progress-form"
                    onSubmit={(event) => handleProgressSubmit(event, goal.id)}
                    noValidate
                  >
                    <label htmlFor={`goal-progress-${goal.id}`}>
                      Adicionar progresso
                      <input
                        id={`goal-progress-${goal.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={progressValues[goal.id] || ""}
                        onChange={(event) =>
                          updateProgressValue(goal.id, event.target.value)
                        }
                        placeholder="0,00"
                        aria-invalid={Boolean(progressErrors[goal.id])}
                        aria-describedby={
                          progressErrors[goal.id]
                            ? `goal-progress-${goal.id}-error`
                            : undefined
                        }
                        required
                      />
                      <FormError id={`goal-progress-${goal.id}-error`}>
                        {progressErrors[goal.id]}
                      </FormError>
                    </label>
                    <button
                      className="secondary-button"
                      type="submit"
                      disabled={Boolean(progressSavingId)}
                    >
                      {progressSavingId === goal.id ? "Atualizando..." : "Atualizar"}
                    </button>
                  </form>

                  <div className="compact-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => startEditing(goal)}
                      disabled={saving || Boolean(progressSavingId) || deletingGoalId === goal.id}
                      aria-label={`Editar meta ${goal.titulo}`}
                    >
                      Editar
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleDeleteGoal(goal)}
                      disabled={deletingGoalId === goal.id}
                      aria-label={`Excluir meta ${goal.titulo}`}
                    >
                      {deletingGoalId === goal.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>
        </>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteGoal)}
        title="Excluir meta?"
        confirmLabel="Excluir meta"
        loading={Boolean(deletingGoalId)}
        onCancel={() => setPendingDeleteGoal(null)}
        onConfirm={confirmDeleteGoal}
      >
        Esta ação remove a meta "{pendingDeleteGoal?.titulo}" e seu progresso
        atual.
      </ConfirmModal>
    </section>
  );
}
