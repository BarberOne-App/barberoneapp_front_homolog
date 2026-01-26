import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import AdminPage from "./pages/AdminPage";
import { 
  verificarAssinaturasVencidas, 
  marcarAssinaturaComoAtrasada,
  enviarNotificacaoAtraso
} from "./services/paymentService";

export default function App() {

  useEffect(() => {
    const verificarAtrasos = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (!currentUser?.id) return;

       
        
        const vencidas = await verificarAssinaturasVencidas();
        const minhasVencidas = vencidas.filter(sub => sub.userId === currentUser.id);

        for (const assinatura of minhasVencidas) {
          
          

          await marcarAssinaturaComoAtrasada(assinatura.id);
          
  
          if (!assinatura.overdueNotificationSent) {
            
            await enviarNotificacaoAtraso(assinatura);
          }
        }
      } catch (error) {

      }
    };


    verificarAtrasos();


    const intervalo = setInterval(verificarAtrasos, 6 * 60 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
