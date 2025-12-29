import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, logout } from '../../services/authService';
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

  useEffect(() => {
    const user = getSession();
    setCurrentUser(user);
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    window.location.href = '/';
  };

  const handleNavClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = '/' + href;
      }
    }
    setMenuOpen(false);
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

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;

 
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header')) {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    if (menuOpen || profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen, profileMenuOpen]);

  
  useEffect(() => {
    const handleScroll = () => {
      setMenuOpen(false);
      setProfileMenuOpen(false);
    };

    if (menuOpen || profileMenuOpen) {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [menuOpen, profileMenuOpen]);

  return (
    <header className="header">
      <Link to="/" className="header__logo-link" onClick={handleLogoClick}>
        <span className="header__logo">Barbearia ADDEV</span>
      </Link>


      <button
        className="header__menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="header__link"
            onClick={(e) => handleNavClick(e, item.href)}
          >
            {item.label}
          </a>
        ))}

        <a
        target='_blank'
          className="header__contato"
          href="https://wa.me/5511999999999"
          onClick={() => setMenuOpen(false)}
        >
          WhatsApp (11) 99999-9999
        </a>


        {currentUser ? (
          <div className="header__profile">
            <button 
              className="header__profile-btn"
              onClick={handleProfileClick}
              aria-label="Menu do perfil"
            >
              <div className="header__profile-avatar">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="header__profile-status">●</span>
            </button>

            {profileMenuOpen && (
              <div className="header__profile-menu">
                <div className="header__profile-info">
                  <strong>{currentUser.name}</strong>
                  {isAdmin && <span className="header__admin-badge">Admin</span>}
                </div>
                <hr />
                <button onClick={handleGoToAppointments}>
                  📅 Meus Agendamentos
                </button>
                {isAdmin && (
                  <button onClick={handleGoToAdmin}>
                    ⚙️ Painel Admin
                  </button>
                )}
                <hr />
                <button onClick={handleLogout} className="header__logout-btn">
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="header__login-btn" onClick={() => setMenuOpen(false)}>
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}