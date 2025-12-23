
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BaseLayout from "../components/layout/BaseLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { authUser } from "../services/userServices.js";
import "./AuthPages.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    if (!email || !password) {
      setMessage({ type: "error", text: "Informe e-mail e senha." });
      setIsSubmitting(false);
      return;
    }

    try {
      const user = await authUser(email, password);
      if (!user) {
        setMessage({ type: "error", text: "E-mail ou senha inválidos." });
        setIsSubmitting(false);
        return;
      }

 
      localStorage.setItem("currentUser", JSON.stringify(user));
      setMessage({ type: "success", text: "Login realizado! Redirecionando..." });

      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro ao conectar com o servidor." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Entrar</h1>
          <p className="auth__subtitle">Acesse sua conta para continuar.</p>

          {message.text && (
            <p className={`auth__message ${message.type === "error" ? "auth__message--error" : "auth__message--success"}`}>
              {message.text}
            </p>
          )}

          <form className="auth__form" onSubmit={handleSubmit}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Validando..." : "Entrar"}</Button>
          </form>

          <p className="auth__switch">Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
        </div>
      </section>
    </BaseLayout>
  );
}
