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
    <main className="login-screen">
      <section className="login-card" aria-labelledby="register-title">
        <div className="login-copy">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">E</span>
            <div>
              <span className="eyebrow">Projeto EcoTree</span>
              <strong>EcoTree</strong>
            </div>
          </div>

          <h1 id="register-title">Crie sua conta e comece sua evolução verde</h1>
          <p>
            Cadastre seus dados para acompanhar metas, transações e o crescimento
            da sua árvore em um só lugar.
          </p>

          <div className="login-highlights" aria-label="Recursos do EcoTree">
            <span>Cadastro rápido</span>
            <span>Acesso com JWT</span>
            <span>Dados protegidos</span>
          </div>
        </div>

        <form className="stack-form login-form" onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              type="text"
              value={form.nome}
              onChange={(event) => updateForm("nome", event.target.value)}
              placeholder="Seu nome"
              minLength="3"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="voce@email.com"
              minLength="5"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={form.senha}
              onChange={(event) => updateForm("senha", event.target.value)}
              placeholder="mínimo de 6 caracteres"
              minLength="6"
              required
            />
          </label>

          {error && <p className="alert error" role="alert">{error}</p>}
          {message && <p className="alert success">{message}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="form-footer">
            Já tenho conta{" "}
            <button className="text-button" type="button" onClick={onShowLogin}>
              Entrar
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
