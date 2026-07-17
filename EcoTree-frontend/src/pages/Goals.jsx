import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
  updateGoalProgress
} from "../services/api.js";
import {
  calculatePercentage,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  toNumber
} from "../utils/formatters.js";

const initialForm = {
  titulo: "",
  valor_meta: "",
  valor_atual: "",
  prazo: ""
};

const goalAccentClasses = ["green", "blue", "amber"];

function getGoalsList(data) {
  const goals = data?.metas || data?.goals || [];
  return Array.isArray(goals) ? goals : [];
}

function normalizeStatus(status) {
  return String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getGoalProgress(goal) {
  const target = toNumber(goal?.valor_meta);

  if (target > 0) {
    return calculatePercentage(goal?.valor_atual, target);
  }

  return calculatePercentage(goal?.progresso_percentual, 100);
}

function isGoalCompleted(goal) {
  return normalizeStatus(goal?.status).includes("conclu") || getGoalProgress(goal) >= 100;
}

function getGoalStatus(goal) {
  if (isGoalCompleted(goal)) {
    return "Concluída";
  }

  const status = String(goal?.status || "").trim();
  return status || "Em andamento";
}

function getGoalDetail(goal) {
  const remaining = Math.max(toNumber(goal?.valor_meta) - toNumber(goal?.valor_atual), 0);

  if (isGoalCompleted(goal)) {
    return "Meta concluída";
  }

  if (remaining > 0) {
    return `${formatCurrency(remaining)} restantes`;
  }

  return "Atualize o progresso para acompanhar";
}

function GoalForm({
  editingGoalId,
  form,
  formErrors,
  onCancel,
  onChange,
  onSubmit,
  saving
}) {
  return (
    <article
      className="redesign-panel form-panel"
      id="goal-form-panel"
      aria-labelledby="goal-form-title"
    >
      <div className="form-card-header">
        <div>
          <span className="eyebrow">{editingGoalId ? "Edição" : "Nova meta"}</span>
          <h2 id="goal-form-title">
            {editingGoalId ? "Editar meta" : "Criar nova meta"}
          </h2>
        </div>
        <button
          className="text-button"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>

      <form className="stack-form polished-form" onSubmit={onSubmit} noValidate>
        <label htmlFor="goal-titulo">
          Título
          <input
            id="goal-titulo"
            type="text"
            value={form.titulo}
            onChange={(event) => onChange("titulo", event.target.value)}
            placeholder="Ex.: Reserva sustentável"
            minLength="3"
            aria-invalid={Boolean(formErrors.titulo)}
            aria-describedby={formErrors.titulo ? "goal-titulo-error" : undefined}
            required
          />
          <FormError id="goal-titulo-error">{formErrors.titulo}</FormError>
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
              onChange={(event) => onChange("valor_meta", event.target.value)}
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
              onChange={(event) => onChange("valor_atual", event.target.value)}
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
            onChange={(event) => onChange("prazo", event.target.value)}
          />
        </label>

        <button className="redesign-primary-button" type="submit" disabled={saving}>
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
  );
}

function GoalOverviewCard({ activeGoals, completedGoals, totalGoals, totalProgress }) {
  return (
    <article
      className="goals-overview-card"
      style={{ "--goal-overview-progress": `${totalProgress}%` }}
    >
      <div className="goals-overview-copy">
        <span>PROGRESSO GERAL</span>
        <strong>{totalProgress}%</strong>
        <p>
          {activeGoals} metas em andamento e {completedGoals} concluída
          {completedGoals === 1 ? "" : "s"}
        </p>
        <div
          className="goals-overview-progress"
          role="progressbar"
          aria-label="Progresso geral das metas"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={totalProgress}
        >
          <span />
        </div>
      </div>

      <div className="goals-overview-ring" aria-hidden="true">
        <span>
          <strong>{totalGoals}</strong>
          metas
        </span>
      </div>
    </article>
  );
}

function GoalProgressUpdate({
  error,
  goal,
  onChange,
  onSubmit,
  progressSavingId,
  value
}) {
  return (
    <form
      className="goal-progress-update-form"
      onSubmit={(event) => onSubmit(event, goal.id)}
      noValidate
    >
      <label htmlFor={`goal-progress-${goal.id}`}>
        Adicionar valor guardado
        <input
          id={`goal-progress-${goal.id}`}
          type="number"
          min="0.01"
          step="0.01"
          value={value || ""}
          onChange={(event) => onChange(goal.id, event.target.value)}
          placeholder="0,00"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `goal-progress-${goal.id}-error` : undefined}
          required
        />
        <FormError id={`goal-progress-${goal.id}-error`}>{error}</FormError>
      </label>
      <button
        className="secondary-button"
        type="submit"
        disabled={Boolean(progressSavingId)}
      >
        {progressSavingId === goal.id ? "Atualizando..." : "Salvar progresso"}
      </button>
    </form>
  );
}

function GoalCard({
  activeProgressGoalId,
  completingGoalId,
  deletingGoalId,
  goal,
  index,
  onComplete,
  onDelete,
  onEdit,
  onProgressChange,
  onProgressSubmit,
  onToggleProgress,
  progressErrors,
  progressSavingId,
  progressValues,
  saving
}) {
  const progress = getGoalProgress(goal);
  const completed = isGoalCompleted(goal);
  const accent = goalAccentClasses[index % goalAccentClasses.length];
  const target = toNumber(goal.valor_meta);
  const current = toNumber(goal.valor_atual);

  return (
    <li className={`goal-card-redesign goal-accent-${accent}`}>
      <div className="goal-card-status-row">
        <span className={completed ? "goal-status done" : "goal-status active"}>
          {getGoalStatus(goal)}
        </span>
        <strong>{progress}%</strong>
      </div>

      <div className="goal-card-main">
        <h3>{goal.titulo}</h3>
        <p>{getGoalDetail(goal)}</p>
      </div>

      <div className="goal-card-values">
        <span>
          {formatCurrency(current)} de {formatCurrency(target)}
        </span>
        <span>Prazo: {formatDate(goal.prazo, undefined, "Sem prazo")}</span>
      </div>

      <div
        className="goal-card-progress"
        role="progressbar"
        aria-label={`Progresso de ${goal.titulo}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="goal-card-actions">
        <button
          className="goal-text-action"
          type="button"
          onClick={() => onToggleProgress(goal)}
          disabled={saving || Boolean(progressSavingId) || deletingGoalId === goal.id}
        >
          Atualizar
        </button>
        {!completed && (
          <button
            className="goal-text-action"
            type="button"
            onClick={() => onComplete(goal)}
            disabled={Boolean(completingGoalId) || deletingGoalId === goal.id}
          >
            {completingGoalId === goal.id ? "Concluindo..." : "Concluir"}
          </button>
        )}
        <button
          className="goal-text-action neutral"
          type="button"
          onClick={() => onEdit(goal)}
          disabled={saving || Boolean(progressSavingId) || deletingGoalId === goal.id}
        >
          Editar
        </button>
        <button
          className="goal-text-action danger"
          type="button"
          onClick={() => onDelete(goal)}
          disabled={deletingGoalId === goal.id}
        >
          {deletingGoalId === goal.id ? "Excluindo..." : "Excluir"}
        </button>
      </div>

      {activeProgressGoalId === goal.id && (
        <GoalProgressUpdate
          error={progressErrors[goal.id]}
          goal={goal}
          onChange={onProgressChange}
          onSubmit={onProgressSubmit}
          progressSavingId={progressSavingId}
          value={progressValues[goal.id]}
        />
      )}
    </li>
  );
}

export default function Goals() {
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [progressValues, setProgressValues] = useState({});
  const [progressErrors, setProgressErrors] = useState({});
  const [activeProgressGoalId, setActiveProgressGoalId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressSavingId, setProgressSavingId] = useState(null);
  const [completingGoalId, setCompletingGoalId] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(null);
  const [error, setError] = useState("");

  async function loadGoals() {
    setLoading(true);
    setError("");

    try {
      const goalsData = await getGoals();
      setGoals(getGoalsList(goalsData));
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
      valor_meta: toNumber(form.valor_meta),
      valor_atual: toNumber(form.valor_atual),
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

  function toggleProgressForm(goal) {
    setActiveProgressGoalId((current) => (current === goal.id ? null : goal.id));
    updateProgressValue(goal.id, "");
  }

  function validateGoalForm() {
    const errors = {};
    const targetValue = toNumber(form.valor_meta);
    const currentValue = toNumber(form.valor_atual);

    if (!form.titulo.trim()) {
      errors.titulo = "Informe o título da meta.";
    } else if (form.titulo.trim().length < 3) {
      errors.titulo = "Use pelo menos 3 caracteres.";
    }

    if (String(form.valor_meta).trim() === "") {
      errors.valor_meta = "Informe o valor da meta.";
    } else if (targetValue <= 0) {
      errors.valor_meta = "O valor da meta precisa ser maior que zero.";
    }

    if (String(form.valor_atual).trim() === "") {
      errors.valor_atual = "Informe o valor atual.";
    } else if (currentValue < 0) {
      errors.valor_atual = "O valor atual não pode ser negativo.";
    }

    return errors;
  }

  function validateProgress(goalId) {
    const value = toNumber(progressValues[goalId]);

    if (String(progressValues[goalId] || "").trim() === "") {
      return "Informe um valor para adicionar ao progresso.";
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

    const value = toNumber(progressValues[goalId]);

    setProgressSavingId(goalId);
    setError("");

    try {
      await updateGoalProgress(goalId, value);
      toast.success("Progresso atualizado com sucesso.");
      updateProgressValue(goalId, "");
      setActiveProgressGoalId(null);
      await loadGoals();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível atualizar o progresso.");
    } finally {
      setProgressSavingId(null);
    }
  }

  async function completeGoal(goal) {
    if (completingGoalId) {
      return;
    }

    const target = toNumber(goal.valor_meta);
    const current = toNumber(goal.valor_atual);

    setCompletingGoalId(goal.id);
    setError("");

    try {
      await updateGoal(goal.id, {
        titulo: goal.titulo,
        valor_meta: target,
        valor_atual: Math.max(current, target),
        prazo: goal.prazo || null,
        status: "concluída"
      });
      toast.success("Meta concluída com sucesso.");
      await loadGoals();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível concluir a meta.");
    } finally {
      setCompletingGoalId(null);
    }
  }

  function handleDeleteGoal(goal) {
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

  const goalsSummary = useMemo(() => {
    const completedGoals = goals.filter((goal) => isGoalCompleted(goal)).length;
    const activeGoals = Math.max(goals.length - completedGoals, 0);
    const totalCurrent = goals.reduce(
      (total, goal) => total + toNumber(goal.valor_atual),
      0
    );
    const totalTarget = goals.reduce(
      (total, goal) => total + toNumber(goal.valor_meta),
      0
    );
    const totalProgress = calculatePercentage(totalCurrent, totalTarget);

    return {
      activeGoals,
      completedGoals,
      totalCurrent,
      totalGoals: goals.length,
      totalProgress,
      totalTarget
    };
  }, [goals]);

  return (
    <section className="page-section goals-redesign" aria-labelledby="goals-title">
      <header className="redesign-page-header">
        <div>
          <span>METAS VERDES</span>
          <h1 id="goals-title">Metas</h1>
          <p>Transforme objetivos em passos possíveis e acompanhe sua evolução.</p>
        </div>

        <button
          className="redesign-primary-button"
          type="button"
          onClick={openNewGoalForm}
          aria-controls="goal-form-panel"
          aria-expanded={showForm}
        >
          Criar nova meta
        </button>
      </header>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <GoalForm
          editingGoalId={editingGoalId}
          form={form}
          formErrors={formErrors}
          onCancel={closeForm}
          onChange={updateForm}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

      {loading ? (
        <LoadingState>Carregando metas...</LoadingState>
      ) : (
        <>
          <GoalOverviewCard
            activeGoals={goalsSummary.activeGoals}
            completedGoals={goalsSummary.completedGoals}
            totalGoals={goalsSummary.totalGoals}
            totalProgress={goalsSummary.totalProgress}
          />

          <div className="goals-summary-grid" aria-label="Resumo das metas">
            <StatCard
              label="ATIVAS"
              value={goalsSummary.activeGoals}
              detail="Em andamento"
              tone="green"
            />
            <StatCard
              label="CONCLUÍDAS"
              value={goalsSummary.completedGoals}
              detail="Metas finalizadas"
              tone="blue"
            />
            <StatCard
              label="VALOR GUARDADO"
              value={formatCompactCurrency(goalsSummary.totalCurrent)}
              detail={`De ${formatCompactCurrency(goalsSummary.totalTarget)}`}
              tone="amber"
            />
          </div>

          <section className="goals-list-section" aria-labelledby="goals-list-title">
            <div className="goals-list-heading">
              <h2 id="goals-list-title">Suas metas</h2>
              {goals.length > 0 && (
                <span>
                  {goals.length} meta{goals.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {goals.length === 0 ? (
              <EmptyState
                title="Nenhuma meta cadastrada ainda."
                actionLabel={showForm ? undefined : "Começar meta"}
                onAction={showForm ? undefined : openNewGoalForm}
              >
                Crie uma meta para acompanhar progresso, valor guardado e prazo.
              </EmptyState>
            ) : (
              <ul className="goal-cards-redesign-grid">
                {goals.map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    activeProgressGoalId={activeProgressGoalId}
                    completingGoalId={completingGoalId}
                    deletingGoalId={deletingGoalId}
                    goal={goal}
                    index={index}
                    onComplete={completeGoal}
                    onDelete={handleDeleteGoal}
                    onEdit={startEditing}
                    onProgressChange={updateProgressValue}
                    onProgressSubmit={handleProgressSubmit}
                    onToggleProgress={toggleProgressForm}
                    progressErrors={progressErrors}
                    progressSavingId={progressSavingId}
                    progressValues={progressValues}
                    saving={saving}
                  />
                ))}
              </ul>
            )}
          </section>
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
        Esta ação remove a meta "{pendingDeleteGoal?.titulo}" e seu progresso atual.
      </ConfirmModal>
    </section>
  );
}
