import { navigationItems } from "./navigationItems.js";

export default function BottomNavigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="Navega\u00e7\u00e3o mobile">
      {navigationItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            activePage === item.id
              ? "bottom-nav-item active"
              : "bottom-nav-item"
          }
          aria-current={activePage === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}
