import Navbar from "./Navbar.jsx";

export default function AppLayout({
  activePage,
  children,
  onLogout,
  onNavigate,
  profile
}) {
  return (
    <div className="app-shell">
      <Navbar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        profile={profile}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
