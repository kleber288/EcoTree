export default function MetricCard({
  label,
  value,
  detail,
  tone = "default",
  icon
}) {
  return (
    <article className={`metric-card ${tone}`}>
      {icon && <span className="metric-icon" aria-hidden="true">{icon}</span>}
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail && <small>{detail}</small>}
    </article>
  );
}
