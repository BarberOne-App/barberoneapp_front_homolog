import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import LandingPage from './pages/LandingPage.jsx';
import Home from './pages/Home.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BarberPage from './pages/BarberPage.jsx';
import ProfilePage from './components/ui/ProfilePage.jsx';

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/home', element: <Home /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/agendamentos', element: <AppointmentsPage /> },
  { path: '/appointments', element: <AppointmentsPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/barber', element: <BarberPage /> },
  { path: '/profile', element: <ProfilePage  /> },
  { path: '*', element: <LandingPage /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}