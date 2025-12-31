import { useState, useEffect } from 'react';
import { getUserCards, deleteCard, setMainCard } from '../../services/cardServices';
import Button from './Button';
import './SavedCardsModal.css';

export default function SavedCardsModal({ isOpen, onClose, userId, onSelectCard }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('📋 SavedCardsModal mounted. isOpen:', isOpen, 'userId:', userId);
    if (isOpen && userId) {
      loadCards();
    }
  }, [isOpen, userId]);

  const loadCards = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando cartões para userId:', userId);
      const userCards = await getUserCards(userId);
      console.log('✅ Cartões carregados:', userCards);
      setCards(userCards);
    } catch (error) {
      console.error('❌ Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCard = (card) => {
    console.log('✔️ Cartão selecionado:', card);
    onSelectCard(card);
    onClose();
  };

  const handleDeleteCard = async (cardId, e) => {
    e.stopPropagation();
    if (confirm('Deseja realmente excluir este cartão?')) {
      try {
        await deleteCard(cardId);
        await loadCards();
      } catch (error) {
        console.error('Erro ao excluir cartão:', error);
        alert('Erro ao excluir cartão');
      }
    }
  };

  const handleSetMainCard = async (cardId, e) => {
    e.stopPropagation();
    try {
      await setMainCard(userId, cardId);
      await loadCards();
    } catch (error) {
      console.error('Erro ao definir cartão principal:', error);
      alert('Erro ao definir cartão principal');
    }
  };

  const getCardBrandIcon = (brand) => {
    const icons = {
      'visa': '💳',
      'mastercard': '💳',
      'elo': '💳',
      'amex': '💳',
      'discover': '💳',
      'unknown': '💳'
    };
    return icons[brand?.toLowerCase()] || '💳';
  };

  const getCardBrandName = (brand) => {
    const brandNames = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'elo': 'Elo',
      'amex': 'American Express',
      'discover': 'Discover',
      'unknown': 'Cartão'
    };
    return brandNames[brand?.toLowerCase()] || 'Cartão';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content saved-cards-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cartões Salvos</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-text">Carregando cartões...</div>
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <p>Você ainda não possui cartões salvos.</p>
              <p className="empty-subtitle">Ao realizar um pagamento, você pode salvar o cartão para uso futuro.</p>
            </div>
          ) : (
            <div className="cards-list">
              {cards.map(card => (
                <div
                  key={card.id}
                  className={`saved-card ${card.isMain ? 'saved-card--main' : ''}`}
                  onClick={() => handleSelectCard(card)}
                >
                  <div className="saved-card__info">
                    <div className="saved-card__brand">
                      <span className="card-icon">{getCardBrandIcon(card.brand)}</span>
                      <span className="card-brand">{getCardBrandName(card.brand)}</span>
                    </div>
                    <div className="saved-card__number">•••• •••• •••• {card.lastDigits}</div>
                    <div className="saved-card__holder">{card.holderName}</div>
                    <div className="saved-card__expiry">Validade: {card.expiryMonth}/{card.expiryYear}</div>
                  </div>

                  <div className="saved-card__actions">
                    {card.isMain ? (
                      <span className="main-badge">Principal</span>
                    ) : (
                      <button
                        className="btn-set-main"
                        onClick={(e) => handleSetMainCard(card.id, e)}
                      >
                        Definir como principal
                      </button>
                    )}
                    <button
                      className="btn-delete-card"
                      onClick={(e) => handleDeleteCard(card.id, e)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
