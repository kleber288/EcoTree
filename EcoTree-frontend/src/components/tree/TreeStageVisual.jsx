export default function TreeStageVisual({
  stage,
  variant = "panel",
  className = ""
}) {
  const classes = [
    "tree-stage-visual",
    `tree-stage-visual-${variant}`,
    stage.classVisual,
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{
        "--stage-accent": stage.colors.accent,
        "--stage-ground": stage.colors.ground,
        "--stage-text": stage.colors.text
      }}
      aria-hidden="true"
    >
      <span className="stage-aura" />
      <span className="stage-ground" />
      <span className="stage-trunk" />
      <span className="stage-stem" />
      <span className="stage-seed-body" />
      <span className="stage-leaf stage-leaf-one" />
      <span className="stage-leaf stage-leaf-two" />
      <span className="stage-leaf stage-leaf-three" />
      <span className="stage-crown stage-crown-left" />
      <span className="stage-crown stage-crown-center" />
      <span className="stage-crown stage-crown-right" />
      <span className="stage-fruit stage-fruit-one" />
      <span className="stage-fruit stage-fruit-two" />
      <span className="stage-fruit stage-fruit-three" />
      <span className="stage-light stage-light-one" />
      <span className="stage-light stage-light-two" />
      <span className="stage-light stage-light-three" />
    </div>
  );
}
