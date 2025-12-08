import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { userExists, createUser, storageKeys } from '../utils/auth.js';
import './AuthPages.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    if (!name || !email || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas precisam ser iguais.' });
      setIsSubmitting(false);
      return;
    }

    if (userExists(email)) {
      setMessage({ type: 'error', text: 'Já existe um usuário com esse e-mail.' });
      setIsSubmitting(false);
      return;
    }

    createUser({ name, email, password });
    setMessage({ type: 'success', text: 'Cadastro realizado com sucesso! Redirecionando...' });
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      navigate('/login');
    }, 800);
    setIsSubmitting(false);
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Criar Conta</h1>
          <p className="auth__subtitle">Cadastre-se para agendar seu próximo corte.</p>
          {message.text && (
            <p
              className={`auth__message ${
                message.type === 'error' ? 'auth__message--error' : 'auth__message--success'
              }`}
            >
              {message.text}
            </p>
          )}
          <form className="auth__form" onSubmit={handleSubmit}>
            <Input label="Nome" name="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="E-mail"
              type="email"
              name="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Senha"
              type="password"
              name="password"
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirmar senha"
              type="password"
              name="confirmPassword"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Validando...' : 'Cadastrar'}
            </Button>
          </form>
          <p className="auth__switch">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
          <p className="auth__subtitle">Chaves usadas: {storageKeys.users}</p>
        </div>
      </section>
    </BaseLayout>
  );
}
