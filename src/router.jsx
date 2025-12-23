import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/agendamentos', element: <AppointmentsPage /> },
  { path: '/appointments', element: <AppointmentsPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '*', element: <Home /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}