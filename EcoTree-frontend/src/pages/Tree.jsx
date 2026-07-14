import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
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

function getNextLevelCopy(treeData) {
  if (!treeData) {
    return "Carregando estágio da sua EcoTree.";
  }

  if (!treeData.proximo_nivel) {
    return "Você chegou ao nível máximo da sua EcoTree.";
  }

  return `${treeData.pontos_para_proximo_nivel || 0} XP para ${treeData.proximo_nivel}`;
}

export default function Tree() {
  const toast = useToast();
  const [treeData, setTreeData] = useState(null);
  const [pontos, setPontos] = useState(5);
  const [motivo, setMotivo] = useState("hábito sustentável");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  async function loadTree() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/tree/status");
      setTreeData(data.arvore);
    } catch (erro) {
      const message = erro.message || "Não foi possível carregar a árvore.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
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

  function updatePointsValue(value) {
    setPontos(value);
    clearFormError("pontos");
  }

  function updateReasonValue(value) {
    setMotivo(value);
    clearFormError("motivo");
  }

  function validatePointsForm() {
    const errors = {};
    const numericPoints = Number(pontos);

    if (String(pontos).trim() === "") {
      errors.pontos = "Informe quantos pontos deseja adicionar.";
    } else if (!Number.isFinite(numericPoints)) {
      errors.pontos = "Use um valor numérico válido.";
    } else if (numericPoints <= 0) {
      errors.pontos = "Os pontos precisam ser maiores que zero.";
    }

    if (!motivo.trim()) {
      errors.motivo = "Informe o motivo dos pontos.";
    }

    return errors;
  }

  async function addPoints() {
    if (savingAction) {
      return;
    }

    const errors = validatePointsForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning("Revise os campos destacados antes de salvar.");
      return;
    }

    setSavingAction("add");
    setError("");

    try {
      const data = await apiRequest("/tree/add-points", {
        method: "PATCH",
        body: {
          pontos: Number(pontos),
          motivo: motivo.trim()
        }
      });

      setTreeData(data.arvore);
      toast.success(data.mensagem || "Pontos adicionados com sucesso.");
    } catch (erro) {
      const message = erro.message || "Não foi possível adicionar pontos.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingAction("");
    }
  }

  async function updateTree() {
    if (savingAction) {
      return;
    }

    setSavingAction("update");
    setError("");

    try {
      const data = await apiRequest("/tree/update", {
        method: "PUT"
      });

      setTreeData(data.arvore);
      toast.success(data.mensagem || "Árvore atualizada com sucesso.");
    } catch (erro) {
      const message = erro.message || "Não foi possível atualizar a árvore.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingAction("");
    }
  }

  const progress = getTreeProgress(treeData);
  const timeline = useMemo(
    () => [
      {
        id: "current",
        title: `${treeData?.pontos || 0} XP acumulados`,
        time: "Agora"
      },
      {
        id: "next",
        title: treeData?.proximo_nivel
          ? `Próximo estágio: ${treeData.proximo_nivel}`
          : "EcoTree no estágio máximo",
        time: treeData?.proximo_nivel ? "Em breve" : "Concluído"
      }
    ],
    [treeData]
  );

  return (
    <section className="page-section tree-v2-page" aria-labelledby="tree-title">
      <div className="tree-v2-header">
        <div>
          <h1 id="tree-title">Minha EcoTree</h1>
          <p>Sua evolução sustentável</p>
        </div>
        <span>Nível {treeData?.nivel ?? "-"}</span>
      </div>

      {error && treeData && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingState>Carregando sua EcoTree...</LoadingState>
      ) : error && !treeData ? (
        <EmptyState
          title="Não foi possível carregar sua EcoTree."
          actionLabel="Tentar novamente"
          onAction={loadTree}
        >
          Confira a conexão com a API e tente atualizar o status outra vez.
        </EmptyState>
      ) : (
        <>
          <article className="tree-hero-card">
            <div className="tree-hero-band">
              <div>
                <h2>{treeData?.nome_nivel || "EcoTree"}</h2>
                <p>{getNextLevelCopy(treeData)}</p>
              </div>
              <span>🌿 jovem</span>
            </div>

            <div className="tree-stage-scene" aria-hidden="true">
              <span className="scene-sun" />
              <span className="scene-cloud scene-cloud-one" />
              <span className="scene-cloud scene-cloud-two" />
              <span className="stage-tree-trunk" />
              <span className="stage-tree-trunk-highlight" />
              <span className="stage-tree-crown stage-tree-main" />
              <span className="stage-tree-crown stage-tree-left" />
              <span className="stage-tree-crown stage-tree-right" />
              <span className="stage-tree-crown stage-tree-top" />
              <span className="stage-tree-crown stage-tree-deep" />
              <span className="stage-tree-fruit fruit-one" />
              <span className="stage-tree-fruit fruit-two" />
              <span className="stage-tree-fruit fruit-three" />
              <span className="scene-ground" />
              <span className="scene-ground-base" />
            </div>

            <div className="tree-hero-progress">
              <div>
                <span>{getNextLevelCopy(treeData)}</span>
                <strong>{progress}%</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Progresso para o próximo nível"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </article>

          <article className="tree-status-panel">
            <span className="tree-status-icon" aria-hidden="true">
              🌱
            </span>
            <div>
              <h2>
                {treeData?.proximo_nivel
                  ? `Próximo estágio: ${treeData.proximo_nivel}`
                  : "EcoTree completa"}
              </h2>
              <p>
                Continue registrando ações para desbloquear folhas, frutos e
                novas recompensas visuais.
              </p>
            </div>
            <strong>
              {treeData?.proximo_nivel
                ? `+${treeData.pontos_para_proximo_nivel || 0} XP`
                : "100%"}
            </strong>
          </article>

          <dl className="tree-metrics-grid">
            <div>
              <span aria-hidden="true">⭐</span>
              <dt>Pontos</dt>
              <dd>{treeData?.pontos ?? 0}</dd>
            </div>
            <div>
              <span aria-hidden="true">🏆</span>
              <dt>Nível</dt>
              <dd>{treeData?.nivel ?? "-"}</dd>
            </div>
            <div>
              <span aria-hidden="true">🔥</span>
              <dt>Progresso</dt>
              <dd>{progress}%</dd>
            </div>
          </dl>

          <article className="data-card tree-actions-card">
            <h2>Adicionar pontos</h2>
            <div className="inline-form">
              <label htmlFor="tree-pontos">
                Pontos
                <input
                  id="tree-pontos"
                  type="number"
                  min="1"
                  value={pontos}
                  onChange={(event) => updatePointsValue(event.target.value)}
                  aria-invalid={Boolean(formErrors.pontos)}
                  aria-describedby={
                    formErrors.pontos ? "tree-pontos-error" : undefined
                  }
                  required
                />
                <FormError id="tree-pontos-error">
                  {formErrors.pontos}
                </FormError>
              </label>
              <label htmlFor="tree-motivo">
                Motivo
                <input
                  id="tree-motivo"
                  type="text"
                  value={motivo}
                  onChange={(event) => updateReasonValue(event.target.value)}
                  placeholder="Ex.: economia no mês"
                  aria-invalid={Boolean(formErrors.motivo)}
                  aria-describedby={
                    formErrors.motivo ? "tree-motivo-error" : undefined
                  }
                  required
                />
                <FormError id="tree-motivo-error">
                  {formErrors.motivo}
                </FormError>
              </label>
            </div>
            <div className="tree-action-row">
              <button
                className="primary-button"
                type="button"
                onClick={addPoints}
                disabled={Boolean(savingAction)}
              >
                {savingAction === "add" ? "Salvando..." : "+ Adicionar pontos"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={updateTree}
                disabled={Boolean(savingAction)}
              >
                {savingAction === "update" ? "Atualizando..." : "Atualizar árvore"}
              </button>
            </div>
          </article>

          <article className="tree-timeline-section">
            <div className="home-section-title">
              <h2>Evolução recente</h2>
            </div>
            <ul className="tree-timeline-card">
              {timeline.map((item) => (
                <li key={item.id}>
                  <span aria-hidden="true" />
                  <strong>{item.title}</strong>
                  <small>{item.time}</small>
                </li>
              ))}
            </ul>
          </article>
        </>
      )}
    </section>
  );
}
