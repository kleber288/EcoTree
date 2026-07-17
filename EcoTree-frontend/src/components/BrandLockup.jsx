export default function BrandLockup({ className = "", tone = "dark" }) {
  const classes = [
    "brand-lockup-v2",
    `brand-lockup-v2-${tone}`,
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <span className="brand-mark-v2" aria-hidden="true">
        E
      </span>
      <span className="brand-copy-v2">
        <strong>EcoTree</strong>
        <small>Jornada verde</small>
      </span>
    </div>
  );
}
