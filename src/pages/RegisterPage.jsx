import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BaseLayout from "../components/layout/BaseLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { register } from "../services/authService.js";
import { BARBERSHOPS } from "../components/layout/Barbershops.jsx";
import "./AuthPages.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [barbershop, setBarbershop] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();



  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidCPF = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, "");
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCPF.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCPF.charAt(10))) return false;
    return true;
  };

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    else if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    else if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    else
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    else if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    else if (cleaned.length <= 11)
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const showError = (text) => {
    setMessage({ type: "error", text });
    setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    if (!name || !email || !cpf || !phone || !birthDate || !barbershop || !password || !confirmPassword) {
      return showError("Preencha todos os campos.");
    }

    if (!isValidEmail(email)) {
      return showError("Digite um e-mail válido. exemplo@dominio.com");
    }

    const cleanCPF = cpf.replace(/\D/g, "");
    if (!isValidCPF(cleanCPF)) {
      return showError("CPF inválido. Verifique os dígitos digitados.");
    }

    const phoneNumbers = phone.replace(/\D/g, "");
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      return showError("Telefone inválido. Use o formato (85) 99999-9999");
    }

    if (password !== confirmPassword) {
      return showError("As senhas precisam ser iguais.");
    }

    if (password.length < 4) {
      return showError("A senha deve ter no mínimo 4 caracteres.");
    }

    try {
      const selectedBarbershop = BARBERSHOPS.find((b) => b.id === barbershop);

      const userData = {
        slug: selectedBarbershop?.slug || "",
        name,
        email,
        cpf: cleanCPF,
        phone: phoneNumbers,
        password,
      };

      await register(userData);
      setMessage({
        type: "success",
        text: "Cadastro realizado! Redirecionando...",
      });
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data) ? err.response.data.join(", ") : null) ||
        "Erro ao cadastrar.";
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card">
          <h1 className="auth-title">Criar Conta</h1>
          <p className="auth-subtitle">Cadastre-se para agendar seu próximo corte.</p>

          {message.text && (
            <p className={`auth-message ${message.type === "error" ? "auth-message--error" : "auth-message--success"}`}>
              {message.text}
            </p>
          )}

          <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
            <div className="full-width">
              <Input
                label="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>
            <div className="full-width">
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <Input
              label="CPF"
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            <Input
              label="Telefone/WhatsApp"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(85) 99999-9999"
              maxLength={15}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />

            <div className="input-wrapper">
              <label className="input-label">Barbearia</label>
              <select
                className="select-field"
                value={barbershop}
                onChange={(e) => setBarbershop(e.target.value)}
                required
              >
                <option value="">Selecione uma barbearia</option>
                {BARBERSHOPS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="full-width">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Validando..." : "Cadastrar"}
              </Button>
            </div>
          </form>

          <p className="auth-footer">
            Já tem conta?{' '}
            <Link to="/login" className="auth-link">Entrar</Link>
          </p>
        </div>
      </section>
    </BaseLayout>
  );
}