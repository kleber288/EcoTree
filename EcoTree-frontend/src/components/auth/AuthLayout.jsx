import BrandLockup from "../BrandLockup.jsx";

const loginSteps = [
  {
    id: "01",
    title: "Registre",
    text: "Ações sustentáveis e movimentações em um só lugar."
  },
  {
    id: "02",
    title: "Evolua",
    text: "Ganhe pontos e acompanhe cada estágio da sua EcoTree."
  },
  {
    id: "03",
    title: "Conquiste",
    text: "Crie metas e celebre o impacto das suas escolhas."
  }
];

const registerMilestones = [
  {
    id: "today",
    title: "Hoje",
    text: "Crie sua conta e conheça sua semente."
  },
  {
    id: "points",
    title: "10 pontos",
    text: "Desbloqueie o estágio Broto."
  },
  {
    id: "routine",
    title: "Sua rotina",
    text: "Avance com hábitos consistentes."
  }
];

export default function AuthLayout({ children, variant = "login" }) {
  const isRegister = variant === "register";
  const title = isRegister
    ? ["Comece simples.", "Cultive hábitos.", "Veja sua evolução."]
    : ["Pequenas escolhas.", "Uma árvore cresce", "com você."];
  const description = isRegister
    ? "Sua primeira árvore começa como uma semente. Cada ação registrada ajuda essa história a crescer."
    : "Transforme hábitos sustentáveis em progresso visível, metas alcançadas e uma rotina mais consciente.";
  const footer = isRegister
    ? "Dados protegidos por autenticação segura."
    : "Sustentabilidade que cabe na sua rotina.";

  return (
    <main className={`redesign-auth-screen redesign-auth-${variant}`}>
      <section className="redesign-auth-grid" aria-label="EcoTree">
        <aside className="redesign-auth-aside">
          <span className="auth-shape auth-shape-top" aria-hidden="true" />
          <span className="auth-shape auth-shape-bottom" aria-hidden="true" />
          {isRegister && (
            <span className="auth-shape auth-shape-ground" aria-hidden="true" />
          )}

          <BrandLockup tone="light" className="redesign-auth-logo" />

          <div className="redesign-auth-copy">
            <h1>
              {title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p>{description}</p>
          </div>

          {isRegister ? (
            <ol className="redesign-auth-timeline" aria-label="Linha da jornada">
              {registerMilestones.map((milestone) => (
                <li key={milestone.id}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{milestone.title}</strong>
                    <p>{milestone.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="redesign-auth-steps" aria-label="Como funciona">
              {loginSteps.map((step) => (
                <li key={step.id}>
                  <span>{step.id}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <p className="redesign-auth-footer">{footer}</p>
        </aside>

        <div className="redesign-auth-content">{children}</div>
      </section>
    </main>
  );
}
