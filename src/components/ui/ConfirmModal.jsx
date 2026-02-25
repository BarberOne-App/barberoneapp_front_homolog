import { AlertTriangle, X } from 'lucide-react';
import Button from './Button.jsx';
import './ConfirmModal.css';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header com X no topo direito */}
        <div className="confirm-modal-header">
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="confirm-modal-icon confirm-modal-icon--{variant}">
          <AlertTriangle size={48} />
        </div>

        <div className="confirm-modal-content">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        <div className="confirm-modal-actions">
          <Button
            onClick={onClose}
            className="confirm-modal-button--cancel"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={`confirm-modal-button--confirm confirm-modal-button--${variant}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
