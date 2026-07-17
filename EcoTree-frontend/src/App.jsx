import { useEffect, useState } from "react";
import AppLayout from "./components/AppLayout.jsx";
import LoadingState from "./components/ui/LoadingState.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Goals from "./pages/Goals.jsx";
import Introduction from "./pages/Introduction.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import Transactions from "./pages/Transactions.jsx";
import Tree from "./pages/Tree.jsx";
import { clearToken, getCurrentUser, getToken } from "./services/api.js";

const pages = {
  dashboard: Dashboard,
  tree: Tree,
  transactions: Transactions,
  goals: Goals,
  profile: Profile
};

export default function App() {
  const [token, setToken] = useState(() => getToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(() => Boolean(getToken()));
  const [activePage, setActivePage] = useState("dashboard");
  const [authPage, setAuthPage] = useState("login");
  const [showIntroduction, setShowIntroduction] = useState(false);

  useEffect(() => {
    function handleLogout() {
      clearToken();
      setToken(null);
      setCurrentUser(null);
      setUserLoading(false);
      setActivePage("dashboard");
      setAuthPage("login");
      setShowIntroduction(false);
    }

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      if (!token) {
        setCurrentUser(null);
        setUserLoading(false);
        return;
      }

      setUserLoading(true);

      try {
        const data = await getCurrentUser();

        if (active) {
          setCurrentUser(data.usuario || data.user || data);
        }
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setUserLoading(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, [token]);

  function handleLogin() {
    setToken(getToken());
    setActivePage("dashboard");
    setAuthPage("login");
    setShowIntroduction(true);
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setCurrentUser(null);
    setUserLoading(false);
    setActivePage("dashboard");
    setAuthPage("login");
    setShowIntroduction(false);
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

  if (userLoading) {
    return (
      <main className="session-loading-screen">
        <LoadingState>Validando sua sessão...</LoadingState>
      </main>
    );
  }

  if (showIntroduction) {
    return (
      <Introduction
        profile={currentUser}
        onFinish={() => setShowIntroduction(false)}
      />
    );
  }

  const ActivePage = pages[activePage] || Dashboard;

  return (
    <AppLayout
      activePage={activePage}
      profile={currentUser}
      onNavigate={setActivePage}
      onLogout={handleLogout}
    >
      <ActivePage
        currentUser={currentUser}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />
    </AppLayout>
  );
}
