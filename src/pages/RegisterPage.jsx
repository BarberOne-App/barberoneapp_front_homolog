import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import './AuthPages.css';

export default function RegisterPage() {
  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Criar Conta</h1>
          <p className="auth__subtitle">Cadastre-se para agendar seu próximo corte.</p>
          <form className="auth__form">
            <Input label="Nome" name="name" placeholder="Seu nome" />
            <Input label="E-mail" type="email" name="email" placeholder="seuemail@exemplo.com" />
            <Input label="Senha" type="password" name="password" placeholder="Crie uma senha" />
            <Input
              label="Confirmar senha"
              type="password"
              name="confirmPassword"
              placeholder="Repita a senha"
            />
            <Button type="submit">Cadastrar</Button>
          </form>
          <p className="auth__switch">
            Já tem conta? <a href="/login">Entrar</a>
          </p>
        </div>
      </section>
    </BaseLayout>
  );
}
