import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { clearCurrentUser } from '../utils/auth.js';
import './AuthPages.css';

export default function AppointmentsPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/login');
  };

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Área logada</h1>
          <p className="auth__subtitle">Em breve, agendamentos disponíveis.</p>
          <Button onClick={handleLogout}>Sair</Button>
        </div>
      </section>
    </BaseLayout>
  );
}
