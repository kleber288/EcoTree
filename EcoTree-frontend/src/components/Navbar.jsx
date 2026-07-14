import BottomNavigation from "./BottomNavigation.jsx";
import TopBar from "./TopBar.jsx";

export default function Navbar({ activePage, onNavigate, onLogout }) {
  return (
    <>
      <TopBar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <BottomNavigation activePage={activePage} onNavigate={onNavigate} />
    </>
  );
}
