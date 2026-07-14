import { useState } from "react";
import { registerUser } from "../services/api.js";

const initialForm = {
  nome: "",
  email: "",
  senha: ""
};

export default function Register({ onShowLogin }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function getRegisterErrorMessage(erro) {
    if (erro?.status === 400) {
      return erro.message || "Este email já está cadastrado.";
    }

    return erro?.message || "Não foi possível criar a conta agora.";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await registerUser({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha
      });

      setForm(initialForm);
      setMessage("Conta criada com sucesso. Agora entre com seu email e senha.");
    } catch (erro) {
      setError(getRegisterErrorMessage(erro));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen auth-screen-register">
      <section className="auth-panel" aria-labelledby="register-title">
        <div className="auth-hero">
          <div className="auth-brand-row">
            <span className="brand-mark auth-brand-mark" aria-hidden="true">E</span>
            <div>
              <span className="auth-kicker">Criar EcoTree</span>
              <strong>Comece simples</strong>
            </div>
          </div>

          <div className="auth-tree auth-tree-sprout" aria-hidden="true">
            <span className="auth-tree-glow" />
            <span className="sprout-stem" />
            <span className="sprout-leaf leaf-left" />
            <span className="sprout-leaf leaf-right" />
            <span className="auth-tree-ground" />
          </div>

          <div className="auth-hero-copy">
            <h1>Crie sua conta e cultive novos hábitos.</h1>
            <p>
              Cadastre-se para acompanhar metas, registros e a evolução da sua
              árvore em um só lugar.
            </p>
          </div>

          <div className="auth-pill">Dados protegidos por login com JWT</div>
        </div>

        <form
          className="auth-card"
          onSubmit={handleSubmit}
          aria-describedby={
            error ? "register-form-error" : message ? "register-form-success" : undefined
          }
        >
          <div className="auth-card-heading">
            <span className="eyebrow">Cadastro</span>
            <h2 id="register-title">Vamos começar</h2>
            <p>Preencha seus dados para entrar na jornada EcoTree.</p>
          </div>

          <label htmlFor="register-nome">
            Nome
            <input
              id="register-nome"
              type="text"
              value={form.nome}
              onChange={(event) => updateForm("nome", event.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              minLength="3"
              required
            />
          </label>

          <label htmlFor="register-email">
            Email
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              minLength="5"
              aria-describedby={error ? "register-form-error" : undefined}
              aria-invalid={Boolean(error)}
              required
            />
          </label>

          <label htmlFor="register-senha">
            Senha
            <input
              id="register-senha"
              type="password"
              value={form.senha}
              onChange={(event) => updateForm("senha", event.target.value)}
              placeholder="mínimo de 6 caracteres"
              autoComplete="new-password"
              minLength="6"
              required
            />
          </label>

          {error && (
            <p
              className="alert error auth-alert"
              id="register-form-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              className="alert success auth-alert"
              id="register-form-success"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="auth-switch">
            Já tenho conta
            <button className="text-button" type="button" onClick={onShowLogin}>
              Entrar
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
