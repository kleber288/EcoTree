import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Goals from "./pages/Goals.jsx";
import Login from "./pages/Login.jsx";
import Transactions from "./pages/Transactions.jsx";
import Tree from "./pages/Tree.jsx";
import { clearToken, getToken } from "./services/api.js";

const pages = {
  dashboard: Dashboard,
  tree: Tree,
  transactions: Transactions,
  goals: Goals
};

export default function App() {
  const [token, setToken] = useState(() => getToken());
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    function handleLogout() {
      clearToken();
      setToken(null);
      setActivePage("dashboard");
    }

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  function handleLogin() {
    setToken(getToken());
    setActivePage("dashboard");
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setActivePage("dashboard");
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const ActivePage = pages[activePage] || Dashboard;

  return (
    <div className="app-shell">
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <ActivePage onNavigate={setActivePage} />
      </main>
    </div>
  );
}
