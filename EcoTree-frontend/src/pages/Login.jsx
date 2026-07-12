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
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-copy">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">E</span>
            <div>
              <span className="eyebrow">Projeto EcoTree</span>
              <strong>EcoTree</strong>
            </div>
          </div>

          <h1 id="login-title">Entre e acompanhe sua evolução verde</h1>
          <p>
            Pequenas escolhas financeiras também podem cultivar hábitos mais
            sustentáveis.
          </p>

          <div className="login-highlights" aria-label="Recursos do EcoTree">
            <span>Árvore em evolução</span>
            <span>Transações organizadas</span>
            <span>Metas com progresso</span>
          </div>
        </div>

        <form className="stack-form login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kleber@email.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="123456"
              minLength="6"
              required
            />
          </label>

          {error && <p className="alert error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="form-footer">
            Ainda não tem conta?{" "}
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
