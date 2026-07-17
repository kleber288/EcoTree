export default function ProfileSummaryCard({ items }) {
  return (
    <article className="profile-summary-card">
      <div className="panel-title-row">
        <div>
          <h2>Resumo da jornada</h2>
          <p>Dados reais carregados das APIs do EcoTree.</p>
        </div>
      </div>

      <dl className="profile-summary-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            {item.detail && <small>{item.detail}</small>}
          </div>
        ))}
      </dl>
    </article>
  );
}
