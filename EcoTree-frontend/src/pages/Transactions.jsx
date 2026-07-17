import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  getTransactionsSummary
} from "../services/api.js";
import {
  calculatePercentage,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  parseApiDate,
  toNumber
} from "../utils/formatters.js";

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

const weekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const categoryTones = ["blue", "amber", "green", "violet", "neutral"];

function formatRecordCount(count) {
  const total = toNumber(count);
  return `${total} registro${total === 1 ? "" : "s"}`;
}

function getTransactionsList(data) {
  const transactions = data?.transacoes || data || [];
  return Array.isArray(transactions) ? transactions : [];
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

function getTransactionType(transaction) {
  return transaction?.tipo === "gasto" ? "gasto" : "ganho";
}

function getTransactionSign(transaction) {
  return getTransactionType(transaction) === "gasto" ? "-" : "+";
}

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildWeeklySummary(transactions) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: getDateKey(date),
      label: weekDayLabels[date.getDay()],
      longLabel: formatDate(date, {
        weekday: "long",
        day: "2-digit",
        month: "short"
      }),
      income: 0,
      expense: 0,
      total: 0,
      count: 0
    };
  });
  const buckets = new Map(days.map((day) => [day.key, day]));

  transactions.forEach((transaction) => {
    const date = parseApiDate(getTransactionDate(transaction));

    if (!date) {
      return;
    }

    const bucket = buckets.get(getDateKey(startOfDay(date)));

    if (!bucket) {
      return;
    }

    const amount = Math.abs(toNumber(transaction.valor));

    if (amount <= 0) {
      return;
    }

    if (getTransactionType(transaction) === "gasto") {
      bucket.expense += amount;
    } else {
      bucket.income += amount;
    }

    bucket.total += amount;
    bucket.count += 1;
  });

  const maxValue = Math.max(...days.map((day) => day.total), 0);
  const incomeTotal = days.reduce((total, day) => total + day.income, 0);
  const expenseTotal = days.reduce((total, day) => total + day.expense, 0);

  return {
    days: days.map((day) => ({
      ...day,
      height: maxValue > 0 ? Math.max(18, Math.round((day.total / maxValue) * 108)) : 0
    })),
    expenseTotal,
    hasData: maxValue > 0,
    incomeTotal,
    movementTotal: incomeTotal + expenseTotal
  };
}

function buildCategoryDistribution(transactions) {
  const totals = new Map();

  transactions.forEach((transaction) => {
    const amount = Math.abs(toNumber(transaction.valor));

    if (amount <= 0) {
      return;
    }

    const category = String(transaction.categoria || "Sem categoria").trim();
    const key = category || "Sem categoria";

    totals.set(key, (totals.get(key) || 0) + amount);
  });

  const grandTotal = Array.from(totals.values()).reduce(
    (total, value) => total + value,
    0
  );

  if (grandTotal <= 0) {
    return [];
  }

  return Array.from(totals.entries())
    .map(([label, value], index) => ({
      label,
      percentage: calculatePercentage(value, grandTotal),
      tone: categoryTones[index % categoryTones.length],
      value
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
}

function TransactionForm({
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
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>

      <form className="stack-form polished-form" onSubmit={onSubmit} noValidate>
        <fieldset className="segmented-field">
          <legend>Tipo</legend>
          <div className="segmented-control">
            <button
              type="button"
              className={form.tipo === "ganho" ? "active" : ""}
              onClick={() => onChange("tipo", "ganho")}
              aria-pressed={form.tipo === "ganho"}
            >
              Entrada
            </button>
            <button
              type="button"
              className={form.tipo === "gasto" ? "active" : ""}
              onClick={() => onChange("tipo", "gasto")}
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
              onChange={(event) => onChange("categoria", event.target.value)}
              placeholder="Ex.: transporte, casa"
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
              onChange={(event) => onChange("valor", event.target.value)}
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
            onChange={(event) => onChange("descricao", event.target.value)}
            placeholder="Detalhe opcional"
          />
        </label>

        <button className="redesign-primary-button" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Criar registro"}
        </button>
      </form>
    </article>
  );
}

function WeeklySummaryPanel({ weeklySummary }) {
  return (
    <article className="redesign-panel weekly-summary-card">
      <div className="panel-title-row">
        <div>
          <h2>Resumo semanal</h2>
          <p>Últimos 7 dias com registros reais.</p>
        </div>
        {weeklySummary.hasData && (
          <span className="soft-count">
            {formatCompactCurrency(weeklySummary.movementTotal)}
          </span>
        )}
      </div>

      {weeklySummary.hasData ? (
        <>
          <div className="weekly-chart" aria-label="Resumo dos últimos 7 dias">
            {weeklySummary.days.map((day) => (
              <div className="weekly-day" key={day.key}>
                <span
                  className="weekly-track"
                  role="img"
                  aria-label={`${day.longLabel}: ${formatCurrency(day.total)} em ${formatRecordCount(day.count)}`}
                >
                  <span
                    className="weekly-value"
                    style={{ height: `${day.height}px` }}
                  />
                </span>
                <small>{day.label}</small>
                <strong>{day.total > 0 ? formatCompactCurrency(day.total) : "-"}</strong>
              </div>
            ))}
          </div>

          <dl className="weekly-totals">
            <div>
              <dt>Entradas</dt>
              <dd>{formatCurrency(weeklySummary.incomeTotal)}</dd>
            </div>
            <div>
              <dt>Saídas</dt>
              <dd>{formatCurrency(weeklySummary.expenseTotal)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <EmptyState title="Sem registros nos últimos 7 dias.">
          Crie registros com data recente para visualizar o resumo semanal.
        </EmptyState>
      )}
    </article>
  );
}

function CategoryDistributionPanel({ categories }) {
  return (
    <article className="redesign-panel category-panel">
      <div className="panel-title-row">
        <div>
          <h2>Distribuição por categoria</h2>
          <p>Soma das movimentações agrupadas por categoria.</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="Sem categorias para comparar.">
          Os registros criados aparecerão aqui quando houver valores.
        </EmptyState>
      ) : (
        <ul className="category-distribution-list">
          {categories.map((category) => (
            <li key={category.label} className={`category-row tone-${category.tone}`}>
              <div>
                <span>{category.label}</span>
                <strong>{formatCurrency(category.value)}</strong>
              </div>
              <span className="category-track" aria-hidden="true">
                <span style={{ width: `${category.percentage}%` }} />
              </span>
              <small>{category.percentage}% do total registrado</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TransactionHistoryItem({
  deletingTransactionId,
  onDelete,
  transaction
}) {
  const type = getTransactionType(transaction);
  const category = transaction.categoria || "Sem categoria";
  const description = transaction.descricao || "Registro sem descrição";
  const amount = formatCurrency(transaction.valor);
  const date = formatDate(getTransactionDate(transaction));

  return (
    <li className={`transaction-row transaction-row-${type}`}>
      <div className="transaction-cell transaction-description-cell">
        <span className={`transaction-dot ${type}`} aria-hidden="true" />
        <div>
          <strong>{description}</strong>
          <small>{category}</small>
        </div>
      </div>
      <span className="transaction-cell">
        <span className="mobile-label">Categoria</span>
        {category}
      </span>
      <span className="transaction-cell">
        <span className="mobile-label">Data</span>
        {date}
      </span>
      <span className={`transaction-cell transaction-type ${type}`}>
        <span className="mobile-label">Tipo</span>
        {typeLabels[type]}
      </span>
      <strong className={`transaction-cell transaction-amount ${type}`}>
        <span className="mobile-label">Valor</span>
        {getTransactionSign(transaction)} {amount}
      </strong>
      <button
        className="danger-button transaction-delete-button"
        type="button"
        onClick={() => onDelete(transaction)}
        disabled={deletingTransactionId === transaction.id}
        aria-label={`Excluir registro ${description}`}
      >
        {deletingTransactionId === transaction.id ? "Excluindo..." : "Excluir"}
      </button>
    </li>
  );
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

      setTransactions(getTransactionsList(listData));
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
    const value = toNumber(form.valor);

    if (!form.categoria.trim()) {
      errors.categoria = "Informe uma categoria.";
    } else if (form.categoria.trim().length < 2) {
      errors.categoria = "Use pelo menos 2 caracteres.";
    }

    if (String(form.valor).trim() === "") {
      errors.valor = "Informe o valor.";
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
        valor: toNumber(form.valor),
        descricao: form.descricao.trim() || null
      };

      await createTransaction(payload);

      toast.success("Registro criado com sucesso.");
      closeForm();
      await loadTransactions();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível criar o registro.");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteTransaction(transaction) {
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
      toast.success("Registro excluído com sucesso.");
      setPendingDeleteTransaction(null);
      await loadTransactions();
    } catch (erro) {
      toast.error(erro.message || "Não foi possível excluir o registro.");
    } finally {
      setDeletingTransactionId(null);
    }
  }

  const incomeCount = transactions.filter(
    (transaction) => getTransactionType(transaction) === "ganho"
  ).length;
  const expenseCount = transactions.filter(
    (transaction) => getTransactionType(transaction) === "gasto"
  ).length;
  const computedIncome = transactions.reduce(
    (total, transaction) =>
      getTransactionType(transaction) === "ganho"
        ? total + Math.abs(toNumber(transaction.valor))
        : total,
    0
  );
  const computedExpense = transactions.reduce(
    (total, transaction) =>
      getTransactionType(transaction) === "gasto"
        ? total + Math.abs(toNumber(transaction.valor))
        : total,
    0
  );
  const totalIncome =
    summary?.total_ganhos !== undefined
      ? toNumber(summary.total_ganhos)
      : computedIncome;
  const totalExpense =
    summary?.total_gastos !== undefined
      ? toNumber(summary.total_gastos)
      : computedExpense;
  const currentBalance =
    summary?.saldo !== undefined ? toNumber(summary.saldo) : totalIncome - totalExpense;
  const totalRecords =
    summary?.total_transacoes !== undefined
      ? toNumber(summary.total_transacoes)
      : transactions.length;
  const weeklySummary = useMemo(
    () => buildWeeklySummary(transactions),
    [transactions]
  );
  const categories = useMemo(
    () => buildCategoryDistribution(transactions),
    [transactions]
  );
  const balanceDetail =
    totalRecords === 0
      ? "Sem registros no período"
      : currentBalance >= 0
        ? "Positivo neste período"
        : "Negativo neste período";

  return (
    <section
      className="page-section transactions-redesign"
      aria-labelledby="transactions-title"
    >
      <header className="redesign-page-header">
        <div>
          <span>CARTEIRA VERDE</span>
          <h1 id="transactions-title">Registros</h1>
          <p>Acompanhe movimentações e hábitos com clareza.</p>
        </div>

        <button
          className="redesign-primary-button"
          type="button"
          onClick={openForm}
          aria-controls="transaction-form-panel"
          aria-expanded={showForm}
        >
          Novo registro
        </button>
      </header>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <TransactionForm
          form={form}
          formErrors={formErrors}
          onCancel={closeForm}
          onChange={updateForm}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

      {loading ? (
        <LoadingState>Carregando registros...</LoadingState>
      ) : (
        <>
          <div className="transactions-summary-grid" aria-label="Resumo de registros">
            <StatCard
              label="SALDO ATUAL"
              value={formatCurrency(currentBalance)}
              detail={balanceDetail}
              tone="green"
            />
            <StatCard
              label="ENTRADAS"
              value={formatCurrency(totalIncome)}
              detail={formatRecordCount(incomeCount)}
              tone="green"
            />
            <StatCard
              label="SAÍDAS"
              value={formatCurrency(totalExpense)}
              detail={formatRecordCount(expenseCount)}
              tone="amber"
            />
          </div>

          <div className="transactions-insights-grid">
            <WeeklySummaryPanel weeklySummary={weeklySummary} />
            <CategoryDistributionPanel categories={categories} />
          </div>

          <article className="redesign-panel transactions-history-panel">
            <div className="panel-title-row">
              <div>
                <h2>Últimos registros</h2>
                <p>{formatRecordCount(totalRecords)} na sua carteira verde.</p>
              </div>
              <span className="filter-chip">Todos os registros</span>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                title="Nenhum registro cadastrado ainda."
                actionLabel={showForm ? undefined : "Criar registro"}
                onAction={showForm ? undefined : openForm}
              >
                Crie a primeira entrada ou saída para montar seu resumo.
              </EmptyState>
            ) : (
              <div className="transactions-table-wrap">
                <div className="transaction-history-header" aria-hidden="true">
                  <span>Descrição</span>
                  <span>Categoria</span>
                  <span>Data</span>
                  <span>Tipo</span>
                  <span>Valor</span>
                  <span>Acao</span>
                </div>
                <ul className="transactions-history-list">
                  {transactions.map((transaction) => (
                    <TransactionHistoryItem
                      key={transaction.id}
                      deletingTransactionId={deletingTransactionId}
                      onDelete={handleDeleteTransaction}
                      transaction={transaction}
                    />
                  ))}
                </ul>
              </div>
            )}
          </article>
        </>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteTransaction)}
        title="Excluir registro?"
        confirmLabel="Excluir registro"
        loading={Boolean(deletingTransactionId)}
        onCancel={() => setPendingDeleteTransaction(null)}
        onConfirm={confirmDeleteTransaction}
      >
        Esta ação remove o registro "{pendingDeleteTransaction?.descricao || pendingDeleteTransaction?.categoria}" do
        seu histórico.
      </ConfirmModal>
    </section>
  );
}
