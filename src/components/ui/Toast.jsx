import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, onClose, duration = 5000, type = 'success' }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    danger: '✕',
    warning: '⚠',
    info: 'i'
  };

  return (
    <div className={`toast toast--${type}`}>
      <div className="toast__content">
        <span className="toast__icon">{icons[type]}</span>
        <p className="toast__message">{message}</p>
      </div>
      <button className="toast__close" onClick={onClose}>×</button>
    </div>
  );
}