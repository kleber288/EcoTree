import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionsSummary
} from "../services/api.js";

const initialForm = {
  tipo: "ganho",
  categoria: "",
  valor: "",
  descricao: ""
};

const typeLabels = {
  ganho: "Entrada",
  gasto: "Saída"
};

const weekLabels = ["S", "T", "Q", "Q", "S", "S", "D"];

function formatRecordCount(count) {
  const total = Number(count || 0);
  return `${total} registro${total === 1 ? "" : "s"}`;
}

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

function getTransactionDate(transaction) {
  return (
    transaction.data ||
    transaction.data_criacao ||
    transaction.criado_em ||
    transaction.created_at ||
    transaction.createdAt ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
}

function getTransactionSign(type) {
  return type === "gasto" ? "-" : "+";
}

function buildChartBars(transactions) {
  if (!transactions.length) {
    return weekLabels.map((label) => ({ label, value: 0, height: 30 }));
  }

  const buckets = weekLabels.map((label) => ({ label, value: 0 }));

  transactions.slice(0, 14).forEach((transaction, index) => {
    const bucketIndex = index % buckets.length;
    buckets[bucketIndex].value += Math.abs(Number(transaction.valor || 0));
  });

  const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return buckets.map((bucket) => ({
    ...bucket,
    height: Math.max(Math.round((bucket.value / maxValue) * 76), 22)
  }));
}

export default function Transactions() {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);
  const [pendingDeleteTransaction, setPendingDeleteTransaction] = useState(null);
  const [error, setError] = useState("");

  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const [listData, summaryData] = await Promise.all([
        getTransactions(),
        getTransactionsSummary()
      ]);

      setTransactions(listData.transacoes || []);
      setSummary(summaryData);
    } catch (erro) {
      setError(erro.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
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

  function openForm() {
    setError("");
    setFormErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setForm(initialForm);
    setFormErrors({});
    setShowForm(false);
  }

  function validateForm() {
    const errors = {};
    const value = Number(form.valor);

    if (!form.categoria.trim()) {
      errors.categoria = "Informe uma categoria.";
    } else if (form.categoria.trim().length < 2) {
      errors.categoria = "Use pelo menos 2 caracteres.";
    }

    if (String(form.valor).trim() === "") {
      errors.valor = "Informe o valor.";
    } else if (!Number.isFinite(value)) {
      errors.valor = "Use um valor numérico válido.";
    } else if (value <= 0) {
      errors.valor = "O valor precisa ser maior que zero.";
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning("Revise os campos destacados antes de salvar.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        tipo: form.tipo,
        categoria: form.categoria.trim(),
        valor: Number(form.valor),
        descricao: form.descricao.trim() || null
      };

      await createTransaction(payload);

      toast.success("Transação criada com sucesso.");
      closeForm();
      await loadTransactions();
    } catch (erro) {
      const message = erro.message || "Não foi possível criar a transação.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction(transaction) {
    setPendingDeleteTransaction(transaction);
  }

  async function confirmDeleteTransaction() {
    if (!pendingDeleteTransaction || deletingTransactionId) {
      return;
    }

    setDeletingTransactionId(pendingDeleteTransaction.id);
    setError("");

    try {
      await deleteTransaction(pendingDeleteTransaction.id);
      toast.success("Transação excluída com sucesso.");
      setPendingDeleteTransaction(null);
      await loadTransactions();
    } catch (erro) {
      const message = erro.message || "Não foi possível excluir a transação.";
      toast.error(message);
    } finally {
      setDeletingTransactionId(null);
    }
  }

  const chartBars = useMemo(
    () => buildChartBars(transactions),
    [transactions]
  );
  const totalIncome = Number(summary?.total_ganhos || 0);
  const totalExpense = Number(summary?.total_gastos || 0);
  const totalMovement = totalIncome + totalExpense;
  const incomeCount = transactions.filter(
    (transaction) => transaction.tipo === "ganho"
  ).length;
  const expenseCount = transactions.filter(
    (transaction) => transaction.tipo === "gasto"
  ).length;
  const incomeRatio =
    totalMovement > 0 ? Math.round((totalIncome / totalMovement) * 100) : 0;

  return (
    <section
      className="page-section polished-page transactions-v2-page"
      aria-labelledby="transactions-title"
    >
      <header className="polished-header">
        <div>
          <span className="eyebrow">Carteira verde</span>
          <h1 id="transactions-title">Registros</h1>
          <p>
            Controle entradas, saídas e hábitos financeiros que alimentam sua
            EcoTree.
          </p>
        </div>

        <button
          className="pill-action"
          type="button"
          onClick={openForm}
          aria-controls="transaction-form-panel"
          aria-expanded={showForm}
        >
          + Registro
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
          id="transaction-form-panel"
          aria-labelledby="transaction-form-title"
        >
          <div className="form-card-header">
            <div>
              <span className="eyebrow">Novo registro</span>
              <h2 id="transaction-form-title">Adicionar movimentação</h2>
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
            <fieldset className="segmented-field">
              <legend>Tipo</legend>
              <div className="segmented-control">
                <button
                  type="button"
                  className={form.tipo === "ganho" ? "active" : ""}
                  onClick={() => updateForm("tipo", "ganho")}
                  aria-pressed={form.tipo === "ganho"}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  className={form.tipo === "gasto" ? "active" : ""}
                  onClick={() => updateForm("tipo", "gasto")}
                  aria-pressed={form.tipo === "gasto"}
                >
                  Saída
                </button>
              </div>
            </fieldset>

            <div className="form-two-columns">
              <label htmlFor="transaction-categoria">
                Categoria
                <input
                  id="transaction-categoria"
                  type="text"
                  value={form.categoria}
                  onChange={(event) =>
                    updateForm("categoria", event.target.value)
                  }
                  placeholder="Ex.: salário, mercado"
                  minLength="2"
                  aria-invalid={Boolean(formErrors.categoria)}
                  aria-describedby={
                    formErrors.categoria
                      ? "transaction-categoria-error"
                      : undefined
                  }
                  required
                />
                <FormError id="transaction-categoria-error">
                  {formErrors.categoria}
                </FormError>
              </label>
              <label htmlFor="transaction-valor">
                Valor
                <input
                  id="transaction-valor"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  onChange={(event) => updateForm("valor", event.target.value)}
                  placeholder="0,00"
                  aria-invalid={Boolean(formErrors.valor)}
                  aria-describedby={
                    formErrors.valor ? "transaction-valor-error" : undefined
                  }
                  required
                />
                <FormError id="transaction-valor-error">
                  {formErrors.valor}
                </FormError>
              </label>
            </div>

            <label htmlFor="transaction-descricao">
              Descrição
              <input
                id="transaction-descricao"
                type="text"
                value={form.descricao}
                onChange={(event) =>
                  updateForm("descricao", event.target.value)
                }
                placeholder="Detalhe opcional"
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar registro"}
            </button>
          </form>
        </article>
      )}

      {loading ? (
        <LoadingState>Carregando registros...</LoadingState>
      ) : (
        <>
      <article className="wallet-hero-card">
        <div>
          <span>Saldo atual</span>
          <strong>{formatCurrency(summary?.saldo)}</strong>
          <p>
            {Number(summary?.saldo || 0) >= 0
              ? "Seu saldo verde está positivo neste período."
              : "Seu saldo verde está negativo neste período."}
          </p>
        </div>
        <span className="wallet-badge">
          {formatRecordCount(summary?.total_transacoes)}
        </span>
        <span className="wallet-icon" aria-hidden="true">
          R$
        </span>
        <div className="summary-progress wallet-progress">
          <span style={{ width: `${incomeRatio}%` }} />
        </div>
      </article>

      <dl className="wallet-metrics-grid">
        <div className="wallet-metric income">
          <dt>Entradas</dt>
          <dd>{formatCompactCurrency(summary?.total_ganhos)}</dd>
          <small>{formatRecordCount(incomeCount)}</small>
        </div>
        <div className="wallet-metric expense">
          <dt>Saídas</dt>
          <dd>{formatCompactCurrency(summary?.total_gastos)}</dd>
          <small>{formatRecordCount(expenseCount)}</small>
        </div>
      </dl>

      <article className="polished-panel chart-panel">
        <div className="list-heading-row">
          <div>
            <span className="eyebrow">Semana</span>
            <h2>Resumo recente</h2>
          </div>
          <span className="soft-count">
            {formatCompactCurrency(totalIncome)} em entradas
          </span>
        </div>
        <div className="mini-chart" aria-label="Resumo visual de registros">
          {chartBars.map((bar, index) => (
            <span key={`${bar.label}-${index}`}>
              <i style={{ height: `${bar.height}px` }} />
              <small>{bar.label}</small>
            </span>
          ))}
        </div>
      </article>

      <article className="polished-panel list-panel">
        <div className="list-heading-row">
          <div>
            <span className="eyebrow">Histórico</span>
            <h2>Últimos registros</h2>
          </div>
          <span className="filter-chip">Tudo</span>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="Nenhuma transação cadastrada ainda."
            actionLabel="Criar registro"
            onAction={openForm}
          >
            Crie a primeira entrada ou saída para montar seu resumo.
          </EmptyState>
        ) : (
          <ul className="records-list">
            {transactions.map((transaction) => (
              <li className="record-card" key={transaction.id}>
                <span
                  className={`record-icon ${transaction.tipo}`}
                  aria-hidden="true"
                >
                  {getTransactionSign(transaction.tipo)}
                </span>

                <div className="record-body">
                  <strong>
                    {typeLabels[transaction.tipo] || transaction.tipo} ·{" "}
                    {transaction.categoria}
                  </strong>
                  <span>{transaction.descricao || "Sem descrição"}</span>
                  <small>{formatDate(getTransactionDate(transaction))}</small>
                </div>

                <div className="record-side">
                  <strong className={`record-amount ${transaction.tipo}`}>
                    {getTransactionSign(transaction.tipo)}
                    {formatCurrency(transaction.valor)}
                  </strong>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDeleteTransaction(transaction)}
                    disabled={deletingTransactionId === transaction.id}
                    aria-label={`Excluir registro ${transaction.categoria}`}
                  >
                    {deletingTransactionId === transaction.id
                      ? "Excluindo..."
                      : "Excluir"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
        </>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteTransaction)}
        title="Excluir transação?"
        confirmLabel="Excluir transação"
        loading={Boolean(deletingTransactionId)}
        onCancel={() => setPendingDeleteTransaction(null)}
        onConfirm={confirmDeleteTransaction}
      >
        Esta ação remove o registro "{pendingDeleteTransaction?.categoria}" do
        seu histórico.
      </ConfirmModal>
    </section>
  );
}
