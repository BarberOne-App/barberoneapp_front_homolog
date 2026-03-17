import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal.jsx';
import './ProductsSection.css';

export default function ProductsSection({ activeSubscription, onBuyProduct }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch('https://barbearia-addev-backend.onrender.com/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(error => console.error('Erro ao carregar produtos:', error));

    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    }
  }, []);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'Bebidas', label: 'Bebidas' },
    { id: 'Pomadas', label: 'Pomadas' },
    { id: 'Óleos', label: 'Óleos' },
    { id: 'Cuidados', label: 'Cuidados' },
    { id: 'Acessórios', label: 'Acessórios' }
  ];

  console.log('products', products);
  const calculatePrice = (product) => {
    const priceString = product.price.replace('R$', '').trim();
    const originalPrice = parseFloat(priceString);
    
    if (isNaN(originalPrice) || originalPrice <= 0) {
      return {
        original: 0,
        final: 0,
        discount: 0,
        hasDiscount: false
      };
    }
    
    if (activeSubscription && product.subscriberDiscount) {
      const discount = parseFloat(product.subscriberDiscount);
      
      if (!isNaN(discount) && discount > 0) {
        const finalPrice = originalPrice * (1 - discount / 100);
        
        return {
          original: originalPrice,
          final: finalPrice,
          discount: discount,
          hasDiscount: true
        };
      }
    }
    
    return {
      original: originalPrice,
      final: originalPrice,
      discount: 0,
      hasDiscount: false
    };
  };

  const filteredProducts = products.filter(product => {
    return selectedCategory === 'all' || product.category === selectedCategory;
  });

  return (
    <section className="products-section">
      <h2>Nossos Produtos</h2>
      <p>Produtos de qualidade para seu cuidado pessoal</p>

      <div className="products-filter">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-btn ${selectedCategory === cat.id ? 'filter-btn--active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="products-empty">
            <Package size={48} />
            <p>Nenhum produto disponível nesta categoria.</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const priceInfo = calculatePrice(product);
            const isOutOfStock = product.stock === 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;

            return (
              <div 
                key={product.id} 
                className={`product-card ${isOutOfStock ? 'product-card--out-of-stock' : ''}`}
              >
                {priceInfo.hasDiscount && (
                  <div className="product-badge product-badge--discount">
                    -{priceInfo.discount}%
                  </div>
                )}
                
                {isOutOfStock && (
                  <div className="product-badge product-badge--out">
                    Esgotado
                  </div>
                )}

                {isLowStock && !isOutOfStock && (
                  <div className="product-badge product-badge--low">
                    Últimas unidades
                  </div>
                )}

                <div className="product-card__image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <div className="product-card__no-image">
                      <Package />
                    </div>
                  )}
                </div>

                <div className="product-card__info">
                  <div className="product-card__category">{product.category}</div>
                  <h3 className="product-card__name">{product.name}</h3>
                  <p className="product-card__description">{product.description}</p>

                  <div className="product-card__pricing">
                    {priceInfo.hasDiscount && (
                      <span className="product-card__price--original">
                        R$ {priceInfo.original.toFixed(2)}
                      </span>
                    )}
                    <span className={priceInfo.hasDiscount ? 'product-card__price--discounted' : 'product-card__price'}>
                      R$ {priceInfo.final.toFixed(2)}
                    </span>
                  </div>

                  {product.stock > 0 && (
                    <div className="product-card__stock">
                      <span className={`stock-indicator ${isLowStock ? 'stock-indicator--low' : ''}`}>
                        {product.stock} em estoque
                      </span>
                    </div>
                  )}

                  <button
                    className="product-card__button"
                    onClick={() => onBuyProduct(product)}
                    disabled={isOutOfStock}
                  >
                    {isOutOfStock ? 'Indisponível' : 'Comprar'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!activeSubscription && (
        <div className="products-cta">
          <div className="products-cta__content">
            <h3>Quer economizar ainda mais?</h3>
            <p>Assine um de nossos planos e ganhe descontos exclusivos!</p>
            <button 
              className="products-cta__button"
              onClick={() => setIsModalOpen(true)}
            >
              Ver Planos
            </button>
          </div>
        </div>
      )}

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
      />
    </section>
  );
}
