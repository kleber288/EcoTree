import { useEffect, useMemo, useState } from "react";
import TreeStagePanel from "../components/tree/TreeStagePanel.jsx";
import TreeStageVisual from "../components/tree/TreeStageVisual.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import FormError from "../components/ui/FormError.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import { apiRequest } from "../services/api.js";
import { getTreeStage, TREE_STAGES } from "../utils/treeStage.js";

function getNextStageCopy(stage) {
  if (!stage.proximoEstagio) {
    return "EcoTree no estágio máximo.";
  }

  return `${stage.pontosParaProximo} pontos para ${stage.proximoEstagio}`;
}

function TreeStageSelector({ currentStage }) {
  return (
    <div className="tree-stage-selector" aria-label="Estágios da árvore">
      {TREE_STAGES.map((stage) => (
        <span
          key={stage.id}
          className={stage.id === currentStage.id ? "active" : undefined}
        >
          {stage.shortName}
        </span>
      ))}
    </div>
  );
}

function TreeStageGallery({ currentStage }) {
  return (
    <section
      id="tree-stage-gallery"
      className="tree-stage-gallery"
      aria-labelledby="tree-stage-gallery-title"
    >
      <div className="tree-stage-gallery-heading">
        <div>
          <span>ESTADOS VISUAIS</span>
          <h2 id="tree-stage-gallery-title">Evolução completa da EcoTree</h2>
          <p>
            Cada nível altera a cor, a paisagem e a ilustração principal da tela
            Árvore.
          </p>
        </div>
        <strong>6 níveis · 1 jornada visual</strong>
      </div>

      <div className="tree-stage-gallery-grid">
        {TREE_STAGES.map((stage) => {
          const galleryStage = getTreeStage(stage.min);
          const isActive = stage.id === currentStage.id;

          return (
            <article
              key={stage.id}
              className={isActive ? "stage-gallery-card active" : "stage-gallery-card"}
              style={{
                "--stage-bg": galleryStage.colors.background,
                "--stage-border": galleryStage.colors.border,
                "--stage-accent": galleryStage.colors.accent,
                "--stage-text": galleryStage.colors.text,
                "--stage-muted": galleryStage.colors.muted
              }}
            >
              <span>{galleryStage.faixa.toUpperCase()}</span>
              <h3>{galleryStage.nome}</h3>
              <p>{galleryStage.tagline}</p>
              <div className="stage-gallery-visual-shell">
                <TreeStageVisual stage={galleryStage} variant="gallery" />
              </div>
              <div className="stage-progress stage-gallery-progress">
                <span style={{ width: `${isActive ? currentStage.progresso : galleryStage.progresso}%` }} />
              </div>
              <small>
                {galleryStage.proximoEstagio ? "Próxima transformação" : "Nível máximo"}
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Tree() {
  const toast = useToast();
  const [treeData, setTreeData] = useState(null);
  const [pontos, setPontos] = useState("");
  const [motivo, setMotivo] = useState("");
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
    } else if (!Number.isInteger(numericPoints)) {
      errors.pontos = "Use um número inteiro de pontos.";
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
      setPontos("");
      setMotivo("");
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

  const currentStage = getTreeStage(treeData?.pontos);
  const timeline = useMemo(
    () => [
      {
        id: "current",
        title: `${currentStage.points} pontos acumulados`,
        time: "Agora"
      },
      {
        id: "next",
        title: currentStage.proximoEstagio
          ? `Próximo estágio: ${currentStage.proximoEstagio}`
          : "EcoTree no estágio máximo",
        time: currentStage.proximoEstagio ? "Em breve" : "Concluído"
      }
    ],
    [currentStage]
  );

  return (
    <section
      className="page-section tree-v2-page tree-redesign"
      aria-labelledby="tree-title"
    >
      <header className="tree-redesign-header">
        <div>
          <span>MINHA ECOTREE</span>
          <h1 id="tree-title">Acompanhe cada fase do seu crescimento</h1>
          <p>A aparência muda a cada nível para tornar sua evolução visível.</p>
        </div>
        <a href="#tree-stage-gallery">Ver galeria de níveis</a>
      </header>

      <TreeStageSelector currentStage={currentStage} />

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
          <div className="tree-redesign-main-grid">
            <TreeStagePanel stage={currentStage} />

            <aside className="tree-level-summary" aria-label="Resumo do nível">
              <span>RESUMO DO NÍVEL</span>
              <div className="tree-summary-stat-list">
                <StatCard
                  label="PONTOS"
                  value={currentStage.points}
                  detail="Total acumulado"
                  tone="soft"
                />
                <StatCard
                  label="NÍVEL"
                  value={currentStage.nivel}
                  detail="Estágio atual"
                  tone="soft"
                />
                <StatCard
                  label="PROGRESSO"
                  value={`${currentStage.progresso}%`}
                  detail="Para o próximo nível"
                  tone="soft"
                />
              </div>

              <div className="tree-next-reward">
                <span>Próxima recompensa</span>
                <strong>
                  {currentStage.proximoEstagio
                    ? `Nova aparência: ${currentStage.proximoEstagio}`
                    : "Nível máximo alcançado"}
                </strong>
              </div>
            </aside>
          </div>

          <div className="tree-redesign-work-grid">
            <article className="tree-add-card">
              <h2>Adicionar pontos</h2>
              <p>Registre uma ação sustentável para avançar.</p>

              <div className="tree-add-form">
                <label htmlFor="tree-pontos">
                  Pontos
                  <input
                    id="tree-pontos"
                    type="number"
                    min="1"
                    step="1"
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
                    placeholder="Hábito sustentável"
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

                <button
                  className="redesign-primary-button tree-add-submit"
                  type="button"
                  onClick={addPoints}
                  disabled={Boolean(savingAction)}
                >
                  {savingAction === "add" ? "Salvando..." : "Adicionar"}
                </button>
              </div>

              <button
                className="secondary-button tree-refresh-button"
                type="button"
                onClick={updateTree}
                disabled={Boolean(savingAction)}
              >
                {savingAction === "update"
                  ? "Atualizando..."
                  : "Atualizar árvore"}
              </button>
            </article>

            <article className="tree-recent-card">
              <h2>Evolução recente</h2>
              <ul>
                {timeline.map((item) => (
                  <li key={item.id}>
                    <span aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <small>{item.time}</small>
                  </li>
                ))}
              </ul>
              <p>{getNextStageCopy(currentStage)}</p>
            </article>
          </div>

          <TreeStageGallery currentStage={currentStage} />
        </>
      )}
    </section>
  );
}
