import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BaseLayout from "../components/layout/BaseLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { userExists, createUser } from "../services/userServices.js";
import "./AuthPages.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const ADMIN_SECRET_CODE = "ADDEV2024";


  const formatPhone = (value) => {
   
    const cleaned = value.replace(/\D/g, '');
    
  
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    if (!name || !email || !phone || !password || !confirmPassword) {
      setMessage({ type: "error", text: "Preencha todos os campos." });
      setIsSubmitting(false);
      return;
    }

   
    const phoneNumbers = phone.replace(/\D/g, '');
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      setMessage({ type: "error", text: "Telefone inválido. Use o formato (85) 99999-9999" });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "As senhas precisam ser iguais." });
      setIsSubmitting(false);
      return;
    }

    if (isAdmin && adminSecret !== ADMIN_SECRET_CODE) {
      setMessage({ type: "error", text: "Código secreto de administrador inválido." });
      setIsSubmitting(false);
      return;
    }

    try {
      const exists = await userExists(email);
      if (exists) {
        setMessage({ type: "error", text: "Já existe um usuário com esse e-mail." });
        setIsSubmitting(false);
        return;
      }

      const userData = {
        name,
        email,
        phone: phoneNumbers, 
        password,
        role: isAdmin ? "admin" : "client",
        isAdmin: isAdmin
      };

      await createUser(userData);
      setMessage({ 
        type: "success", 
        text: `Cadastro ${isAdmin ? 'de administrador' : ''} realizado! Redirecionando...` 
      });
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro ao cadastrar." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Criar Conta</h1>
          <p className="auth__subtitle">Cadastre-se para agendar seu próximo corte.</p>

          {message.text && (
            <p className={`auth__message ${message.type === "error" ? "auth__message--error" : "auth__message--success"}`}>
              {message.text}
            </p>
          )}

          <form className="auth__form" onSubmit={handleSubmit}>
            <Input 
              label="Nome Completo" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome completo"
            />
            <Input 
              label="E-mail" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
            />
            <Input 
              label="Telefone/WhatsApp" 
              type="tel" 
              value={phone} 
              onChange={handlePhoneChange}
              placeholder="(85) 99999-9999"
              maxLength="15"
            />
            <Input 
              label="Senha" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
            />
            <Input 
              label="Confirmar senha" 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
            />

            <div className="admin-option">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                <span>Cadastrar como Administrador</span>
              </label>
            </div>

            {isAdmin && (
              <Input 
                label="Código Secreto de Admin" 
                type="password"
                value={adminSecret} 
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Digite o código secreto"
              />
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Validando..." : "Cadastrar"}
            </Button>
          </form>

          <p className="auth__switch">Já tem conta? <Link to="/login">Entrar</Link></p>
        </div>
      </section>
    </BaseLayout>
  );
}