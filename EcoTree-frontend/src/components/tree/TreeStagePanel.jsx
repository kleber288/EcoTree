import TreeStageVisual from "./TreeStageVisual.jsx";

export default function TreeStagePanel({ stage }) {
  const progressLabel = stage.proximoEstagio
    ? `${stage.points} / ${stage.pontosProximoEstagio} pontos`
    : `${stage.points} pontos acumulados`;

  return (
    <article
      className="tree-stage-panel"
      style={{
        "--stage-bg": stage.colors.background,
        "--stage-border": stage.colors.border,
        "--stage-accent": stage.colors.accent,
        "--stage-text": stage.colors.text,
        "--stage-muted": stage.colors.muted
      }}
    >
      <div className="tree-stage-panel-copy">
        <span>NÍVEL {stage.nivel}</span>
        <h2>{stage.nome}</h2>
        <p>{stage.description}</p>

        <strong className="tree-next-badge">
          {stage.proximoEstagio
            ? `Próximo: ${stage.proximoEstagio} em ${stage.pontosParaProximo} pontos`
            : "Nível máximo"}
        </strong>

        <div
          className="stage-progress"
          role="progressbar"
          aria-label="Progresso para o próximo estágio"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={stage.progresso}
        >
          <span style={{ width: `${stage.progresso}%` }} />
        </div>
        <small>{progressLabel}</small>
      </div>

      <TreeStageVisual stage={stage} />
    </article>
  );
}
