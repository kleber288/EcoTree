import { useState } from "react";
import { loginUser, saveToken } from "../services/api.js";

export default function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getLoginErrorMessage(erro) {
    if (erro?.status === 401) {
      return "Email ou senha não conferem. Revise os dados e tente novamente.";
    }

    return erro?.message || "Não foi possível entrar agora. Tente novamente em instantes.";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginUser({ email, senha });

      saveToken(data.access_token);
      onLogin();
    } catch (erro) {
      setError(getLoginErrorMessage(erro));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen auth-screen-login">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-hero">
          <div className="auth-brand-row">
            <span className="brand-mark auth-brand-mark" aria-hidden="true">E</span>
            <div>
              <span className="auth-kicker">EcoTree</span>
              <strong>Jornada verde</strong>
            </div>
          </div>

          <div className="auth-tree auth-tree-grown" aria-hidden="true">
            <span className="auth-tree-glow" />
            <span className="auth-tree-crown crown-left" />
            <span className="auth-tree-crown crown-center" />
            <span className="auth-tree-crown crown-right" />
            <span className="auth-tree-trunk" />
            <span className="auth-tree-ground" />
          </div>

          <div className="auth-hero-copy">
            <h1>Seu progresso sustentável começa aqui.</h1>
            <p>
              Entre para acompanhar sua árvore, organizar registros e transformar
              pequenas escolhas em evolução diária.
            </p>
          </div>

          <div className="auth-pill">Continue sua jornada verde</div>
        </div>

        <form
          className="auth-card"
          onSubmit={handleSubmit}
          aria-describedby={error ? "login-form-error" : undefined}
        >
          <div className="auth-card-heading">
            <span className="eyebrow">Login</span>
            <h2 id="login-title">Bem-vindo de volta</h2>
            <p>Use seu email e senha para continuar evoluindo sua EcoTree.</p>
          </div>

          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              aria-describedby={error ? "login-form-error" : undefined}
              aria-invalid={Boolean(error)}
              required
            />
          </label>

          <label htmlFor="login-senha">
            Senha
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="mínimo de 6 caracteres"
              autoComplete="current-password"
              minLength="6"
              aria-describedby={error ? "login-form-error" : undefined}
              aria-invalid={Boolean(error)}
              required
            />
          </label>

          {error && (
            <p className="alert error auth-alert" id="login-form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Entrando..." : "Entrar no EcoTree"}
          </button>

          <p className="auth-switch">
            Ainda não tem conta?
            <button
              className="text-button"
              type="button"
              onClick={onShowRegister}
            >
              Criar conta
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
