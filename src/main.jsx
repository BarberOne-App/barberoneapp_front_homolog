import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AppRouter from './router.jsx';
import './styles.css';

const root = document.getElementById('root');
const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '920578295404-irksjqd94v85eebs2fod06t54721kmn7.apps.googleusercontent.com';

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppRouter />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
