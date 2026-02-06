import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, logout } from '../../services/authService';
import { buscarAssinaturaAtiva } from '../../services/paymentService';
import ManageSubscriptionModal from '../ui/ManageSubscriptionModal.jsx';
import logoImg from '../../assets/logo-barber-rodrigues-new.jpg';
import { FaWhatsapp } from 'react-icons/fa';
import './Header.css';

const navItems = [
  { label: 'Início', href: '#inicio' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Fotos', href: '#fotos' },
  { label: 'Sobre', href: '#sobre' },
];

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    const user = getSession();
    setCurrentUser(user);
    if (user) {
      verificarAssinaturaAtiva(user.id);
    }
  }, []);

  const verificarAssinaturaAtiva = async (userId) => {
    try {
      const assinatura = await buscarAssinaturaAtiva(userId);
      setActiveSubscription(assinatura);
    } catch (error) {

    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    window.location.href = '/';
  };

const handleNavClick = (e, href) => {
  e.preventDefault();
  setMenuOpen(false);
  
  if (href.startsWith('#')) {
    const isHomePage = window.location.pathname === '/';
    
    if (isHomePage) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  } else {
    window.location.href = '/' + href;
  }
};

  const handleLogout = () => {
    logout();
    setProfileMenuOpen(false);
    navigate('/login');
  };

  const handleProfileClick = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleGoToAppointments = () => {
    setProfileMenuOpen(false);
    navigate('/appointments');
  };

  const handleGoToAdmin = () => {
  setProfileMenuOpen(false);
  navigate('/admin');
};

  const handleManageSubscription = () => {
    setProfileMenuOpen(false);
    setMenuOpen(false);
    setShowManageModal(true);
  };

  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
  const isReceptionist = currentUser?.role === 'receptionist';
  const isBarber = currentUser?.role === 'barber';
  const hasAdminAccess = isAdmin || isReceptionist || currentUser?.permissions?.viewAdmin;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header')) {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    if (menuOpen || profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuOpen, profileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setMenuOpen(false);
      setProfileMenuOpen(false);
    };

    if (menuOpen || profileMenuOpen) {
      window.addEventListener('scroll', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [menuOpen, profileMenuOpen]);

  return (
    <>
      <header className="header">
        <a href="/" className="header__logo-link" onClick={handleLogoClick}>
          <img src={logoImg} alt="Barbearia Rodrigues" className="header__logo-img" />
        </a>

        <button
          className="header__menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          ☰
        </button>

        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="header__link"
              onClick={(e) => handleNavClick(e, item.href)}
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://wa.me/5585999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="header__contato"
          >
            <FaWhatsapp /> Fale conosco
          </a>

          {currentUser ? (
            <div className="header__profile">
              <button
                className="header__profile-btn"
                onClick={handleProfileClick}
                aria-label="Perfil"
              >
                <div className="header__profile-avatar">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="header__profile-status">▼</span>
              </button>

              {profileMenuOpen && (
                <div className="header__profile-menu">
                  <div className="header__profile-info">
                    <strong>{currentUser.name}</strong>
                    {isAdmin && <span className="header__admin-badge">ADMIN</span>}
                    {isReceptionist && <span className="header__admin-badge">RECEPCIONISTA</span>}
                    {isBarber && <span className="header__admin-badge">BARBEIRO</span>}
                    {activeSubscription && (
                      <span className="header__subscription-badge">
                        ✓ Plano {activeSubscription.planName}
                      </span>
                    )}
                  </div>
                  <hr />
                  <button onClick={handleGoToAppointments}>Meus Agendamentos</button>
                  {activeSubscription && (
                    <button
                      onClick={handleManageSubscription}
                      className="header__subscription-btn"
                    >
                      Gerenciar Plano
                    </button>
                  )}
                  {hasAdminAccess && (
                    <button onClick={handleGoToAdmin}>Painel Admin</button>
                  )}
                  <hr />
                  <button onClick={handleLogout} className="header__logout-btn">
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="header__login-btn">
              Entrar
            </Link>
          )}
        </nav>
      </header>

      {showManageModal && activeSubscription && (
  <ManageSubscriptionModal
    isOpen={showManageModal}
    onClose={() => setShowManageModal(false)}  // <-- CORRIGIDO AQUI
    subscription={activeSubscription}
  />
)}
    </>
  );
}
