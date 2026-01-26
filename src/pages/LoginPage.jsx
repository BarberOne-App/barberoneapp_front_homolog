import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import { login } from '../services/authService';
import './AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setToast({
        show: true,
        message: 'Preencha todos os campos.',
        type: 'danger'
      });
      return;
    }

    setLoading(true);

    try {
      const user = await login(email, password);

      if (!user) {
        setToast({
          show: true,
          message: 'Email ou senha inválidos.',
          type: 'danger'
        });
        setLoading(false);
        return;
      }

     
      if (user.role === 'admin' || user.isAdmin === true) {
        navigate('/');
      } else if (user.role === 'barber') {
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setToast({
        show: true,
        message: 'Erro ao tentar fazer login. Tente novamente.',
        type: 'danger'
      });
      setLoading(false);
    }
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Bem-vindo de volta</h1>
            <p className="auth-subtitle">Faça login para acessar sua conta</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="auth-footer">
            Não tem uma conta?{' '}
            <Link to="/register" className="auth-link">
              Cadastre-se
            </Link>
          </p>
        </div>
      </section>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}
    </BaseLayout>
  );
}
