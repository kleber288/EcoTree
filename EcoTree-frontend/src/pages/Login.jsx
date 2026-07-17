import { useState } from "react";
import AuthField from "../components/auth/AuthField.jsx";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import { loginUser, saveToken } from "../services/api.js";

export default function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout variant="login">
      <form
        className="redesign-auth-card redesign-login-card"
        onSubmit={handleSubmit}
        aria-describedby={error ? "login-form-error" : undefined}
      >
        <div className="redesign-auth-heading">
          <span>ACESSO</span>
          <h2 id="login-title">Bem-vindo de volta</h2>
          <p>Entre para continuar cultivando sua jornada.</p>
        </div>

        <AuthField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          autoComplete="email"
          aria-describedby={error ? "login-form-error" : undefined}
          aria-invalid={Boolean(error)}
          required
        />

        <AuthField
          id="login-senha"
          label="Senha"
          type={showPassword ? "text" : "password"}
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          minLength="6"
          aria-describedby={error ? "login-form-error" : undefined}
          aria-invalid={Boolean(error)}
          required
          action={
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              <span className="password-eye" aria-hidden="true" />
            </button>
          }
        />

        <div className="redesign-auth-row">
          <span>Esqueci minha senha</span>
        </div>

        {error && (
          <p className="alert error auth-alert" id="login-form-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="redesign-primary-button"
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Entrando..." : "Entrar no EcoTree"}
        </button>

        <p className="redesign-auth-switch">
          Ainda não tem conta?
          <button
            className="redesign-text-button"
            type="button"
            onClick={onShowRegister}
          >
            Criar conta
          </button>
        </p>

        <div className="redesign-auth-divider" />
        <p className="redesign-auth-terms">
          Ao entrar, você concorda com os Termos e a Política de Privacidade.
        </p>
      </form>
    </AuthLayout>
  );
}
