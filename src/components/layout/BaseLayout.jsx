import Header from './Header.jsx';
import './BaseLayout.css';

export default function BaseLayout({ children }) {
  return (
    <div className="layout">
      <Header />
      <main className="layout__content">{children}</main>
    </div>
  );
}
