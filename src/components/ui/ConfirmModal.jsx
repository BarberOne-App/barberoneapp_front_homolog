import { AlertTriangle, X } from 'lucide-react';
import Button from './Button.jsx';
import './ConfirmModal.css';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger" 
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className={`confirm-modal__icon confirm-modal__icon--${variant}`}>
          <AlertTriangle size={48} />
        </div>

        <div className="confirm-modal__content">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        <div className="confirm-modal__actions">
          <Button onClick={onClose} className="confirm-modal__button--cancel">
            {cancelText}
          </Button>
          <Button onClick={handleConfirm} className={`confirm-modal__button--confirm confirm-modal__button--${variant}`}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}