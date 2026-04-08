import { CheckCircle, X } from 'lucide-react';
import Button from './Button.jsx';
import './SuccessModal.css';

export default function SuccessModal({ isOpen, onClose, title, message, details }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        {/* <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button> */}

        <div className="success-modal__icon">
          <CheckCircle size={64} />
        </div>

        <div className="success-modal__content">
          <h2>{title}</h2>
          <p className="success-modal__message">{message}</p>

          {details && (
            <div className="success-modal__details">
              {details.map((detail, index) => (
                <div key={index} className="detail-item">
                  <span className="detail-label">{detail.label}:</span>
                  <span className="detail-value">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onClose} className="success-modal__button">
          Entendi
        </Button>
      </div>
    </div>
  );
}