import { navigationItems } from "./navigationItems.js";

export default function TopBar({ activePage, onNavigate, onLogout }) {
  return (
    <header className="topbar">
      <button
        className="brand"
        type="button"
        onClick={() => onNavigate("dashboard")}
        aria-label="Ir para Home"
      >
        <span className="brand-mark" aria-hidden="true">E</span>
        <span className="brand-copy">
          <span className="brand-text">EcoTree</span>
          <span className="brand-subtitle">Jornada verde</span>
        </span>
      </button>

      <nav className="desktop-nav" aria-label="Navega\u00e7\u00e3o principal">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "nav-link active" : "nav-link"}
            aria-current={activePage === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="logout-button" type="button" onClick={onLogout}>
        Sair
      </button>
    </header>
  );
}
