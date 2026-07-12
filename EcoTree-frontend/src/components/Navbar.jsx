const links = [
  { id: "dashboard", label: "Painel" },
  { id: "tree", label: "Árvore" },
  { id: "transactions", label: "Transações" },
  { id: "goals", label: "Metas" }
];

export default function Navbar({ activePage, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      <button
        className="brand"
        type="button"
        onClick={() => onNavigate("dashboard")}
      >
        <span className="brand-mark">E</span>
        <span className="brand-text">EcoTree</span>
      </button>

      <nav className="nav-links" aria-label="Navegação principal">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            className={activePage === link.id ? "nav-link active" : "nav-link"}
            aria-current={activePage === link.id ? "page" : undefined}
            onClick={() => onNavigate(link.id)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <button className="logout-button" type="button" onClick={onLogout}>
        Sair
      </button>
    </header>
  );
}
