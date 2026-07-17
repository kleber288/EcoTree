import BottomNavigation from "./BottomNavigation.jsx";
import TopBar from "./TopBar.jsx";

export default function Navbar({ activePage, onNavigate, onLogout, profile }) {
  return (
    <>
      <TopBar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        profile={profile}
      />
      <BottomNavigation activePage={activePage} onNavigate={onNavigate} />
    </>
  );
}
