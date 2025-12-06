import { Link } from 'react-router-dom';
import './Header.css';

const navItems = [
  { label: 'Agendamentos', href: '#' },
  { label: 'Serviços', href: '#' },
  { label: 'Fotos', href: '#' },
  { label: 'Sobre', href: '#' },
];

export default function Header() {
  return (
    <header className="header">
      <div className="header__logo">Barbearia ADDEV</div>
      <nav className="header__nav">
        {navItems.map((item) => (
          <a key={item.label} href={item.href} className="header__link">
            {item.label}
          </a>
        ))}
        <a className="header__cta" href="https://wa.me/5511999999999">
          WhatsApp (11) 99999-9999
        </a>
      </nav>
    </header>
  );
}
