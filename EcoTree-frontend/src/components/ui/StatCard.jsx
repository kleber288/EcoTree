export default function StatCard({
  label,
  value,
  detail,
  tone = "green",
  className = ""
}) {
  const classes = ["redesign-stat-card", `redesign-stat-card-${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <span className="redesign-stat-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
