import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function StripeReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Quando a Stripe redirecionar de volta, assumimos que o pagamento foi concluido
    // (configurar o Payment Link na Stripe para redirecionar para esta rota)
    // Aqui apenas redirecionamos o usuário para a tela de login.
    const params = new URLSearchParams(location.search);
    const email = params.get('prefilled_email') || params.get('email') || '';

    // Opcional: podemos mostrar uma mensagem breve antes do redirecionamento.
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  }, [location.search, navigate]);

  return (
    <div style={{ padding: 24, minHeight: '60vh' }}>
      <h2>Pagamento concluído</h2>
      <p>Obrigado! Você será redirecionado para a tela de login em instantes.</p>
      <p>Use o e-mail cadastrado para acessar sua conta.</p>
    </div>
  );
}
