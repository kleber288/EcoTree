import Navbar from "./Navbar.jsx";

export default function AppLayout({
  activePage,
  children,
  onLogout,
  onNavigate
}) {
  return (
    <div className="app-shell">
      <Navbar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
