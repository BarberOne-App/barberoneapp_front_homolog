import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import './AuthPages.css';

export default function LoginPage() {
  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Entrar</h1>
          <p className="auth__subtitle">Acesse sua conta para continuar.</p>
          <form className="auth__form">
            <Input label="E-mail" type="email" name="email" placeholder="seuemail@exemplo.com" />
            <Input label="Senha" type="password" name="password" placeholder="••••••••" />
            <Button type="submit">Entrar</Button>
          </form>
          <p className="auth__switch">
            Não tem conta? <a href="/cadastro">Cadastre-se</a>
          </p>
        </div>
      </section>
    </BaseLayout>
  );
}
