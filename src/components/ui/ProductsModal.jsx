import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ProductsModal.css';

export default function ProductsModal({
  isOpen,
  onClose,
  products,
  onConfirm,
  hasActiveSubscription,
  servicePrice = 0,
  serviceName = '',
  onUpdateStock,
  preSelectedProducts = [],
}) {
  const [selectedProducts, setSelectedProducts] = useState(() =>
    preSelectedProducts.map(p => ({ ...p, quantity: p.quantity || 1 }))
  );

  useEffect(() => {
    setSelectedProducts(preSelectedProducts.map(p => ({ ...p, quantity: p.quantity || 1 })));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductToggle = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleQuantityChange = (productId, change) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p;
        const newQuantity = p.quantity + change;
        return newQuantity <= 0 ? null : { ...p, quantity: newQuantity };
      }).filter(Boolean)
    );
  };

  const parsePrice = (priceString) => {
    if (typeof priceString === 'number') return priceString;
    let cleanPrice = priceString.toString().replace(/R\$/g, '').trim();
    if (cleanPrice.includes(',')) cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : price;
  };

  const calculateProductPrice = (product) => {
    const basePrice = parsePrice(product.price);
    if (hasActiveSubscription && product.subscriberDiscount) {
      return basePrice * (1 - product.subscriberDiscount / 100);
    }
    return basePrice;
  };

  const calculateProductsTotal = () =>
    selectedProducts.reduce((sum, product) =>
      sum + calculateProductPrice(product) * product.quantity, 0);

  const calculateFinalTotal = () => {
    const productsTotal = calculateProductsTotal();
    return hasActiveSubscription ? productsTotal : (servicePrice + productsTotal);
  };

  const handleConfirm = () => {
    const productsTotal = calculateProductsTotal();
    const finalTotal = calculateFinalTotal();
    const productsWithCalculatedPrice = selectedProducts.map(product => ({
      ...product,
      calculatedPrice: calculateProductPrice(product),
      totalPrice: calculateProductPrice(product) * product.quantity,
    }));

    onConfirm({
      products: productsWithCalculatedPrice,
      productsTotal,
      servicePrice: hasActiveSubscription ? 0 : servicePrice,
      finalTotal,
      hasActiveSubscription,
    });
    setSelectedProducts([]);
  };

  const handleSkip = () => {
    onConfirm({
      products: [],
      productsTotal: 0,
      servicePrice: hasActiveSubscription ? 0 : servicePrice,
      finalTotal: hasActiveSubscription ? 0 : servicePrice,
      hasActiveSubscription,
    });
    setSelectedProducts([]);
  };

  const productsTotal = calculateProductsTotal();
  const finalTotal = calculateFinalTotal();

  return (
    <div className="modal-overlay">
      <div className="products-modal-container">
        <div className="products-modal-header">
          <h2>Adicionar Produtos</h2>
          <p>{serviceName || 'Serviço não informado'}</p>
          <button className="products-close-button" onClick={onClose}>✕</button>
        </div>

        <div className="products-modal-subtitle">
          Deseja adicionar algum produto ao seu atendimento?
        </div>

        <div className="products-modal-content">
          {products.length === 0 ? (
            <p className="products-empty-message">Nenhum produto disponível no momento.</p>
          ) : (
            <div className="products-grid">
              {products.map(product => {
                const selected = selectedProducts.find(p => p.id === product.id);
                const price = calculateProductPrice(product);
                const isOutOfStock = product.stock !== undefined && product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className={`product-card ${selected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                    onClick={() => !isOutOfStock && handleProductToggle(product)}
                  >
                    {product.image && (
                      <div className="product-image">
                        <img src={product.image} alt={product.name} />
                        {hasActiveSubscription && product.subscriberDiscount && (
                          <span className="discount-badge">-{product.subscriberDiscount}%</span>
                        )}
                      </div>
                    )}

                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>

                      <div className="product-pricing">
                        {hasActiveSubscription && product.subscriberDiscount ? (
                          <>
                            <span className="original-price">
                              R$ {parsePrice(product.price).toFixed(2)}
                            </span>
                            <span className="discounted-price">
                              R$ {price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="product-price">R$ {price.toFixed(2)}</span>
                        )}
                      </div>

                      {product.stock !== undefined && (
                        <span className="product-stock">
                          {isOutOfStock ? 'Sem estoque' : `Estoque: ${product.stock}`}
                        </span>
                      )}
                    </div>

                    {selected && (
                      <div className="quantity-controls" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleQuantityChange(product.id, -1)}>−</button>
                        <span>{selected.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          disabled={product.stock !== undefined && selected.quantity >= product.stock}
                        >+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="products-modal-summary">
          <div className="summary-breakdown">
            {!hasActiveSubscription && (
              <div className="summary-row">
                <span>Serviço ({serviceName || 'Serviço não informado'})</span>
                <span>R$ {parsePrice(servicePrice).toFixed(2)}</span>
              </div>
            )}
            {selectedProducts.length > 0 && (
              <div className="summary-row">
                <span>Produtos</span>
                <span>R$ {productsTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>
                {hasActiveSubscription && finalTotal === 0
                  ? 'Grátis (Plano)'
                  : `R$ ${finalTotal.toFixed(2)}`}
              </span>
            </div>
            {hasActiveSubscription && (
              <p className="subscriber-note">✓ Serviço coberto pelo seu plano ativo</p>
            )}
          </div>
        </div>

        <div className="products-modal-footer">
          <button className="btn-secondary" onClick={handleSkip}>Pular</button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={selectedProducts.length === 0}
          >
            Confirmar
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
  hasActiveSubscription: PropTypes.bool,
  servicePrice: PropTypes.number,
  serviceName: PropTypes.string,
  onUpdateStock: PropTypes.func,
  preSelectedProducts: PropTypes.array,
};