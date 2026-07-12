import { useEffect, useState } from "react";
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);
  const [message, setMessage] = useState("");
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
        tipo: form.tipo,
        categoria: form.categoria.trim(),
        valor: Number(form.valor),
        descricao: form.descricao.trim() || null
      };

      await createTransaction(payload);

      setMessage("Transação criada com sucesso.");
      setForm(initialForm);
      await loadTransactions();
    } catch (erro) {
      setError(erro.message || "Não foi possível criar a transação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction(transaction) {
    if (!window.confirm(`Excluir a transação "${transaction.categoria}"?`)) {
      return;
    }

    setDeletingTransactionId(transaction.id);
    setMessage("");
    setError("");

    try {
      await deleteTransaction(transaction.id);
      setMessage("Transação excluída com sucesso.");
      await loadTransactions();
    } catch (erro) {
      setError(erro.message || "Não foi possível excluir a transação.");
    } finally {
      setDeletingTransactionId(null);
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <span className="eyebrow">Transações</span>
        <h1>Controle financeiro</h1>
        <p>
          Registre entradas e saídas para manter seu saldo claro e alimentar o
          crescimento da sua EcoTree.
        </p>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      <div className="content-grid">
        <article className="data-card">
          <h2>Resumo</h2>
          <dl className="metric-grid">
            <div className="metric-card positive">
              <dt>Entradas</dt>
              <dd>{formatCurrency(summary?.total_ganhos)}</dd>
            </div>
            <div className="metric-card warning">
              <dt>Saídas</dt>
              <dd>{formatCurrency(summary?.total_gastos)}</dd>
            </div>
            <div className="metric-card">
              <dt>Saldo</dt>
              <dd>{formatCurrency(summary?.saldo)}</dd>
            </div>
            <div className="metric-card">
              <dt>Registros</dt>
              <dd>{summary?.total_transacoes || 0}</dd>
            </div>
          </dl>
        </article>

        <article className="data-card">
          <h2>Nova transação</h2>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Tipo
              <select
                value={form.tipo}
                onChange={(event) => updateForm("tipo", event.target.value)}
              >
                <option value="ganho">Entrada (ganho)</option>
                <option value="gasto">Saída (gasto)</option>
              </select>
            </label>
            <label>
              Categoria
              <input
                type="text"
                value={form.categoria}
                onChange={(event) =>
                  updateForm("categoria", event.target.value)
                }
                placeholder="Ex.: salário, mercado, transporte"
                minLength="2"
                required
              />
            </label>
            <label>
              Valor
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={(event) => updateForm("valor", event.target.value)}
                placeholder="0,00"
                required
              />
            </label>
            <label>
              Descrição
              <input
                type="text"
                value={form.descricao}
                onChange={(event) =>
                  updateForm("descricao", event.target.value)
                }
                placeholder="Detalhe opcional"
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar transação"}
            </button>
          </form>
        </article>
      </div>

      <article className="data-card">
        <h2>Lista de transações</h2>
        {loading ? (
          <p className="muted">Carregando transações...</p>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma transação cadastrada ainda.</strong>
            <p>Crie a primeira entrada ou saída para montar seu resumo.</p>
          </div>
        ) : (
          <ul className="item-list">
            {transactions.map((transaction) => (
              <li className="transaction-item" key={transaction.id}>
                <div className="item-main">
                  <strong>{transaction.categoria}</strong>
                  <span>{transaction.descricao || "Sem descrição"}</span>
                </div>
                <div className="item-meta">
                  <span className={`pill ${transaction.tipo}`}>
                    {typeLabels[transaction.tipo] || transaction.tipo}
                  </span>
                  <strong className={`amount ${transaction.tipo}`}>
                    {transaction.tipo === "gasto" ? "-" : "+"}
                    {formatCurrency(transaction.valor)}
                  </strong>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDeleteTransaction(transaction)}
                    disabled={deletingTransactionId === transaction.id}
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
    </section>
  );
}
