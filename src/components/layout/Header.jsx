import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, logout } from '../../services/authService';
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

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header')) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => setMenuOpen(false);

    if (menuOpen) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [menuOpen]);


  return (
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
          <button
            className="header__profile-btn"
            onClick={handleProfileClick}
            aria-label="Meu Perfil"
          >
            Meu Perfil
          </button>
        ) : (
          <Link to="/login" className="header__login-btn">
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}