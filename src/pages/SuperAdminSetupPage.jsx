import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import Toast from '../components/ui/Toast.jsx';
import { registerSuperAdminSetup } from '../services/authService.js';
import './AuthPages.css';

export default function SuperAdminSetupPage() {
  const navigate = useNavigate();
  const [setupKey, setSetupKey] = useState('');
  const [name, setName] = useState('Super Admin');
  const [email, setEmail] = useState('superadm@barberone.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!setupKey || !name || !email || !password) {
      setToast({ show: true, message: 'Preencha todos os campos.', type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      const user = await registerSuperAdminSetup({
        setupKey,
        name,
        email,
        password,
      });

      setToast({
        show: true,
        message: `Super admin ${user.email} criado com sucesso.`,
        type: 'success',
      });

      setTimeout(() => navigate('/super-admin'), 800);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data) ? error.response.data.join(', ') : null) ||
        'Erro ao criar super admin.';
      setToast({ show: true, message: msg, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Setup Super Admin</h1>
            <p className="auth-subtitle">Página temporária para criar o primeiro super administrador.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="Chave de setup"
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              placeholder="SUPER_ADMIN_SETUP_KEY"
            />

            <Input
              label="Nome"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Super Admin"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadm@barberone.com"
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 4 caracteres"
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Super Admin'}
            </Button>
          </form>

          <p className="auth-footer">
            Já tem conta?{' '}
            <Link to="/login" className="auth-link">
              Ir para login
            </Link>
          </p>
        </div>
      </section>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}
    </BaseLayout>
  );
}
