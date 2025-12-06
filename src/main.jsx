import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './router.jsx';
import './styles.css';

const root = document.getElementById('root');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
