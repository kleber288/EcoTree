import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Goals from "./pages/Goals.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
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
  const [authPage, setAuthPage] = useState("login");

  useEffect(() => {
    function handleLogout() {
      clearToken();
      setToken(null);
      setActivePage("dashboard");
      setAuthPage("login");
    }

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  function handleLogin() {
    setToken(getToken());
    setActivePage("dashboard");
    setAuthPage("login");
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setActivePage("dashboard");
    setAuthPage("login");
  }

  if (!token) {
    if (authPage === "register") {
      return <Register onShowLogin={() => setAuthPage("login")} />;
    }

    return (
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setAuthPage("register")}
      />
    );
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
