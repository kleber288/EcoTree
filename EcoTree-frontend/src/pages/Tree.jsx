import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

function getTreeProgress(treeData) {
  const pontos = Number(treeData?.pontos || 0);
  const restantes = Number(treeData?.pontos_para_proximo_nivel || 0);
  const alvo = pontos + restantes;

  if (!treeData?.proximo_nivel || alvo <= 0) {
    return 100;
  }

  return Math.min(Math.round((pontos / alvo) * 100), 100);
}

export default function Tree() {
  const [treeData, setTreeData] = useState(null);
  const [pontos, setPontos] = useState(5);
  const [motivo, setMotivo] = useState("hábito sustentável");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTree() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/tree/status");
      setTreeData(data.arvore);
    } catch (erro) {
      setError(erro.message || "Não foi possível carregar a árvore.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
  }, []);

  async function addPoints() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const data = await apiRequest("/tree/add-points", {
        method: "PATCH",
        body: {
          pontos: Number(pontos),
          motivo
        }
      });

      setTreeData(data.arvore);
      setMessage(data.mensagem);
    } catch (erro) {
      setError(erro.message || "Não foi possível adicionar pontos.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTree() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const data = await apiRequest("/tree/update", {
        method: "PUT"
      });

      setTreeData(data.arvore);
      setMessage(data.mensagem);
    } catch (erro) {
      setError(erro.message || "Não foi possível atualizar a árvore.");
    } finally {
      setSaving(false);
    }
  }

  const progress = getTreeProgress(treeData);

  return (
    <section className="page-section">
      <div className="section-heading">
        <span className="eyebrow">Árvore</span>
        <h1>Status da sua EcoTree</h1>
        <p>
          Veja como seus pontos, metas e registros ajudam sua árvore a crescer.
        </p>
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      {loading ? (
        <p className="muted">Carregando árvore...</p>
      ) : (
        <div className="tree-layout">
          <article className="data-card tree-status-card">
            <div className="tree-visual-wrap">
              <div className="tree-visual" aria-hidden="true">
                <span className="tree-canopy" />
                <span className="tree-trunk" />
              </div>
              <span className="tree-level-badge">
                Nível {treeData?.nivel ?? "-"}
              </span>
            </div>

            <div className="tree-status-content">
              <span className="eyebrow">Status atual</span>
              <h2>{treeData?.nome_nivel || "Semente"}</h2>
              <p>
                {treeData?.proximo_nivel
                  ? `Faltam ${treeData.pontos_para_proximo_nivel} pontos para ${treeData.proximo_nivel}.`
                  : "Você chegou ao nível máximo da sua EcoTree."}
              </p>

              <div className="progress-block">
                <div className="progress-label">
                  <span>Progresso do nível</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </article>

          <div className="content-grid">
            <article className="data-card">
              <h2>Informações principais</h2>
              <dl className="stat-list">
                <div>
                  <dt>Pontos acumulados</dt>
                  <dd>{treeData?.pontos ?? 0}</dd>
                </div>
                <div>
                  <dt>Nível</dt>
                  <dd>{treeData?.nivel ?? "-"}</dd>
                </div>
                <div>
                  <dt>Próximo nível</dt>
                  <dd>{treeData?.proximo_nivel || "Completo"}</dd>
                </div>
              </dl>
            </article>

            <article className="data-card">
              <h2>Adicionar pontos</h2>
              <div className="inline-form">
                <label>
                  Pontos
                  <input
                    type="number"
                    min="1"
                    value={pontos}
                    onChange={(event) => setPontos(event.target.value)}
                  />
                </label>
                <label>
                  Motivo
                  <input
                    type="text"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder="Ex.: economia no mês"
                  />
                </label>
              </div>
              <div className="button-row">
                <button
                  className="primary-button"
                  type="button"
                  onClick={addPoints}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Adicionar pontos"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={updateTree}
                  disabled={saving}
                >
                  Atualizar árvore
                </button>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
