import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession } from '../../services/authService';
import { getHomeInfo } from '../../services/settingsService.js';
import logoImg from '../../assets/barbearia-rodrigues.png';
import { FaWhatsapp } from 'react-icons/fa';
import './Header.css';

const navItems = [
  { label: 'Início', href: '#inicio' },
  { label: 'Planos', href: '#planos'},
  { label: 'Agendamentos', href: 'agendamentos' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Fotos', href: '#fotos' },
  { label: 'Sobre', href: '#sobre' },
];

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [whatsappHref, setWhatsappHref] = useState('https://wa.me/5585999999999');

  useEffect(() => {
    const user = getSession();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadWhatsappNumber = async () => {
      try {
        const homeInfo = await getHomeInfo();
        const whatsappNumber = String(homeInfo?.whatsappNumber || '').replace(/\D/g, '');

        if (!isMounted) return;

        if (whatsappNumber) {
          setWhatsappHref(`https://wa.me/${whatsappNumber}`);
          return;
        }

        setWhatsappHref('https://wa.me/5585999999999');
      } catch {
        if (!isMounted) return;
        setWhatsappHref('https://wa.me/5585999999999');
      }
    };

    loadWhatsappNumber();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate('/home');
  };

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    if (href.startsWith('#')) {
      const isHomePage = window.location.pathname === '/home';
      if (isHomePage) {
        const element = document.querySelector(href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/home');
        setTimeout(() => {
          const element = document.querySelector(href);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      navigate('/' + href);
    }
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header')) setMenuOpen(false);
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
          href={whatsappHref}
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