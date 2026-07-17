import { useState } from "react";
import AuthField from "../components/auth/AuthField.jsx";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import { registerUser } from "../services/api.js";

const initialForm = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  acceptedTerms: false
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

  function validateForm() {
    if (form.senha !== form.confirmarSenha) {
      return "As senhas precisam ser iguais.";
    }

    if (!form.acceptedTerms) {
      return "Confirme os Termos de Uso e a Política de Privacidade.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

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
    <AuthLayout variant="register">
      <form
        className="redesign-auth-card redesign-register-card"
        onSubmit={handleSubmit}
        aria-describedby={
          error ? "register-form-error" : message ? "register-form-success" : undefined
        }
      >
        <div className="redesign-auth-heading">
          <span>CADASTRO</span>
          <h2 id="register-title">Crie sua EcoTree</h2>
          <p>Leva menos de um minuto para começar.</p>
        </div>

        <AuthField
          id="register-nome"
          label="Nome"
          type="text"
          value={form.nome}
          onChange={(event) => updateForm("nome", event.target.value)}
          placeholder="Seu nome"
          autoComplete="name"
          minLength="3"
          required
        />

        <AuthField
          id="register-email"
          label="Email"
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

        <AuthField
          id="register-senha"
          label="Senha"
          type="password"
          value={form.senha}
          onChange={(event) => updateForm("senha", event.target.value)}
          placeholder="Mínimo de 6 caracteres"
          autoComplete="new-password"
          minLength="6"
          required
        />

        <AuthField
          id="register-confirmar-senha"
          label="Confirmar senha"
          type="password"
          value={form.confirmarSenha}
          onChange={(event) => updateForm("confirmarSenha", event.target.value)}
          placeholder="Digite a senha novamente"
          autoComplete="new-password"
          minLength="6"
          aria-describedby={error ? "register-form-error" : undefined}
          aria-invalid={Boolean(error)}
          required
        />

        <label className="redesign-terms-check" htmlFor="register-termos">
          <input
            id="register-termos"
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(event) => updateForm("acceptedTerms", event.target.checked)}
            required
          />
          <span>
            Li e concordo com os Termos de Uso e a Política de Privacidade.
          </span>
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
          className="redesign-primary-button"
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Criando conta..." : "Criar minha conta"}
        </button>

        <p className="redesign-auth-switch">
          Já possui uma conta?
          <button className="redesign-text-button" type="button" onClick={onShowLogin}>
            Entrar
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
