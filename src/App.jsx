import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import AdminPage from "./pages/AdminPage";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="agendamentos" element={<AppointmentsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}