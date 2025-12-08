import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/agendamentos', element: <AppointmentsPage /> },
  { path: '*', element: <LoginPage /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
