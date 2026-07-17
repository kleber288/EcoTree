import BrandLockup from "../components/BrandLockup.jsx";

const introCards = [
  {
    id: "tree",
    badge: "A",
    tone: "green",
    title: "Acompanhe sua árvore",
    text: "Visualize níveis, pontos e o próximo estágio da evolução."
  },
  {
    id: "records",
    badge: "R",
    tone: "amber",
    title: "Registre suas ações",
    text: "Organize entradas, saídas e hábitos sustentáveis."
  },
  {
    id: "goals",
    badge: "M",
    tone: "blue",
    title: "Crie metas possíveis",
    text: "Defina objetivos claros e acompanhe o progresso."
  },
  {
    id: "profile",
    badge: "P",
    tone: "violet",
    title: "Cuide do seu perfil",
    text: "Personalize sua foto e veja suas conquistas."
  }
];

function getDisplayName(profile) {
  const rawName = profile?.nome || profile?.email?.split("@")[0] || "";
  const firstName = rawName.trim().split(" ")[0];

  if (!firstName) {
    return "";
  }

  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

export default function Introduction({ onFinish, profile }) {
  const name = getDisplayName(profile);

  return (
    <main className="intro-screen">
      <header className="intro-topbar">
        <BrandLockup />
        <button className="intro-skip" type="button" onClick={onFinish}>
          Pular introdução
        </button>
      </header>

      <section className="intro-shell" aria-labelledby="intro-title">
        <div className="intro-hero">
          <div className="intro-copy">
            <span className="intro-kicker">
              {name ? `Olá, ${name}` : "Olá"}
            </span>
            <h1 id="intro-title">Sua jornada sustentável começa agora.</h1>
            <p>
              O EcoTree transforma pequenas atitudes em uma evolução visual,
              simples e motivadora.
            </p>

            <div className="intro-actions">
              <button className="redesign-primary-button" type="button" onClick={onFinish}>
                Conhecer o aplicativo
              </button>
              <span>1 de 3</span>
            </div>
          </div>

          <article className="intro-tree-panel" aria-label="Estágio inicial da EcoTree">
            <div className="intro-tree-copy">
              <span>Nível 1</span>
              <h2>SEMENTE</h2>
              <p>
                Sua EcoTree cresce conforme você registra ações, cumpre metas
                e mantém consistência.
              </p>
              <div
                className="intro-progress-track"
                role="progressbar"
                aria-label="Progresso da semente"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="32"
              >
                <span />
              </div>
              <small>Próximo estágio: Broto</small>
            </div>

            <div className="intro-tree-visual" aria-hidden="true">
              <span className="intro-tree-moon" />
              <span className="intro-tree-trunk" />
              <span className="intro-tree-crown intro-tree-crown-one" />
              <span className="intro-tree-crown intro-tree-crown-two" />
              <span className="intro-tree-crown intro-tree-crown-three" />
              <span className="intro-tree-ground" />
            </div>
          </article>
        </div>

        <div className="intro-section-heading">
          <h2>Tudo que você precisa em um só lugar</h2>
          <p>Uma experiência organizada para acompanhar seu impacto sem complicação.</p>
        </div>

        <div className="intro-feature-grid">
          {introCards.map((card) => (
            <article className="intro-feature-card" key={card.id}>
              <span className={`intro-card-badge ${card.tone}`} aria-hidden="true">
                {card.badge}
              </span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <strong>Saiba mais</strong>
            </article>
          ))}
        </div>

        <footer className="intro-footer">
          <div className="intro-dots" aria-hidden="true">
            <span className="active" />
            <span />
            <span />
          </div>
          <button className="intro-continue" type="button" onClick={onFinish}>
            Continuar
          </button>
        </footer>
      </section>
    </main>
  );
}
