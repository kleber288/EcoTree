import useProfilePhoto from "../hooks/useProfilePhoto.js";
import BrandLockup from "./BrandLockup.jsx";
import NavIcon from "./NavIcon.jsx";
import { navigationItems } from "./navigationItems.js";
import ProfileAvatar from "./profile/ProfileAvatar.jsx";

export default function TopBar({ activePage, onNavigate, onLogout, profile }) {
  const { photoUrl } = useProfilePhoto(profile);

  return (
    <header className="topbar">
      <button
        className="brand"
        type="button"
        onClick={() => onNavigate("dashboard")}
        aria-label="Ir para Home"
      >
        <BrandLockup variant="navbar" className="topbar-brand-logo" />
      </button>

      <nav className="desktop-nav" aria-label="Navega\u00e7\u00e3o principal">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "nav-link active" : "nav-link"}
            aria-label={item.ariaLabel}
            aria-current={activePage === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">
              <NavIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <button
          className="topbar-profile-button"
          type="button"
          onClick={() => onNavigate("profile")}
          aria-label="Abrir perfil"
          aria-current={activePage === "profile" ? "page" : undefined}
        >
          <ProfileAvatar
            email={profile?.email}
            name={profile?.nome || profile?.name}
            photoUrl={photoUrl}
            size="nav"
          />
        </button>

        <button className="logout-button" type="button" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
