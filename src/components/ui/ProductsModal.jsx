import { useState } from 'react';
import PropTypes from 'prop-types';
import './ProductsModal.css';

export default function ProductsModal({ 
  isOpen, 
  onClose, 
  products, 
  onConfirm, 
  hasActiveSubscription,
  servicePrice = 0
}) {
  const [selectedProducts, setSelectedProducts] = useState([]);

  if (!isOpen) return null;

  const handleProductToggle = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (productId, change) => {
    setSelectedProducts(prev => {
      return prev.map(p => {
        if (p.id === productId) {
          const newQuantity = p.quantity + change;
          
          if (newQuantity <= 0) {
            return null;
          }
          
          return { ...p, quantity: newQuantity };
        }
        return p;
      }).filter(p => p !== null); 
    });
  };

  const parsePrice = (priceString) => {
    if (typeof priceString === 'number') return priceString;
    
    let cleanPrice = priceString.toString().replace(/R\$/g, '').trim();
    
    if (cleanPrice.includes(',')) {
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    }
    
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : price;
  };

  const calculateProductPrice = (product) => {
    const basePrice = parsePrice(product.price);
    
    if (hasActiveSubscription && product.subscriberDiscount) {
      const discount = product.subscriberDiscount / 100;
      return basePrice * (1 - discount);
    }
    return basePrice;
  };

  const calculateProductsTotal = () => {
    return selectedProducts.reduce((sum, product) => {
      const price = calculateProductPrice(product);
      return sum + (price * product.quantity);
    }, 0);
  };

  const calculateFinalTotal = () => {
    const productsTotal = calculateProductsTotal();
    return hasActiveSubscription ? productsTotal : (servicePrice + productsTotal);
  };

  const handleConfirm = () => {
    const productsTotal = calculateProductsTotal();
    const finalTotal = calculateFinalTotal();
    
    const productsWithCalculatedPrice = selectedProducts.map(product => {
      const calculatedPrice = calculateProductPrice(product);
      return {
        ...product,
        calculatedPrice,
        totalPrice: calculatedPrice * product.quantity
      };
    });
    
    onConfirm({
      products: productsWithCalculatedPrice,
      productsTotal,
      servicePrice: hasActiveSubscription ? 0 : servicePrice,
      finalTotal,
      hasActiveSubscription
    });
    setSelectedProducts([]);
  };

  const handleSkip = () => {
    onConfirm({
      products: [],
      productsTotal: 0,
      servicePrice: hasActiveSubscription ? 0 : servicePrice,
      finalTotal: hasActiveSubscription ? 0 : servicePrice,
      hasActiveSubscription
    });
    setSelectedProducts([]);
  };

  const availableProducts = products.filter(p => p.stock > 0);
  const productsTotal = calculateProductsTotal();
  const finalTotal = calculateFinalTotal();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="products-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="products-modal-header">
          <h2>Produtos Disponíveis</h2>
          <button className="products-close-button" onClick={onClose}>×</button>
        </div>

        <div className="products-modal-subtitle">
          Aproveite para levar produtos de qualidade com você!
        </div>

        <div className="products-modal-content">
          {availableProducts.length === 0 ? (
            <p className="products-empty-message">Nenhum produto disponível no momento.</p>
          ) : (
            <div className="products-grid">
              {availableProducts.map(product => {
                const isSelected = selectedProducts.find(p => p.id === product.id);
                const selectedProduct = selectedProducts.find(p => p.id === product.id);
                const price = calculateProductPrice(product);
                const originalPrice = parsePrice(product.price);
                const hasDiscount = hasActiveSubscription && product.subscriberDiscount;

                return (
                  <div 
                    key={product.id} 
                    className={`product-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleProductToggle(product)}
                  >
                    <div className="product-image">
                      <img src={product.image} alt={product.name} />
                      {hasDiscount && (
                        <span className="discount-badge">-{product.subscriberDiscount}%</span>
                      )}
                    </div>

                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                      
                      <div className="product-pricing">
                        {hasDiscount ? (
                          <>
                            <span className="original-price">R$ {originalPrice.toFixed(2)}</span>
                            <span className="discounted-price">R$ {price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="product-price">R$ {price.toFixed(2)}</span>
                        )}
                      </div>

                      <div className="product-stock">
                        Estoque: {product.stock} {product.stock === 1 ? 'unidade' : 'unidades'}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product.id, -1);
                          }}
                          title="Diminuir quantidade (0 remove o produto)"
                        >
                          -
                        </button>
                        <span>{selectedProduct.quantity}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product.id, 1);
                          }}
                          disabled={selectedProduct.quantity >= product.stock}
                          title="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(selectedProducts.length > 0 || (!hasActiveSubscription && servicePrice > 0)) && (
          <div className="products-modal-summary">
            <div className="summary-breakdown">
              {selectedProducts.length > 0 && (
                <div className="summary-row">
                  <span>Produtos ({selectedProducts.length}):</span>
                  <span>R$ {productsTotal.toFixed(2)}</span>
                </div>
              )}
              {!hasActiveSubscription && servicePrice > 0 && (
                <div className="summary-row">
                  <span>Serviço:</span>
                  <span>R$ {servicePrice.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span><strong>Total:</strong></span>
                <span>R$ {finalTotal.toFixed(2)}</span>
              </div>
              {hasActiveSubscription && (
                <div className="subscriber-note">
                  ✓ Serviço incluído no plano
                </div>
              )}
            </div>
          </div>
        )}

        <div className="products-modal-footer">
          <button className="btn-secondary" onClick={handleSkip}>
            {hasActiveSubscription && selectedProducts.length === 0 ? 'Confirmar' : 'Pular'}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={selectedProducts.length === 0 && (!hasActiveSubscription || servicePrice === 0)}
          >
            {selectedProducts.length > 0 ? `Adicionar (${selectedProducts.length})` : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

ProductsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  products: PropTypes.array.isRequired,
  onConfirm: PropTypes.func.isRequired,
  hasActiveSubscription: PropTypes.bool.isRequired,
  servicePrice: PropTypes.number
};
