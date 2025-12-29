import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ProductsSection.css';

export default function ProductsSection({ products, activeSubscription }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  

  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const calculatePrice = (product) => {
    if (!activeSubscription || !product.subscriberDiscount) {
      return {
        original: product.price,
        discounted: null,
        hasDiscount: false
      };
    }

    const priceValue = parseFloat(product.price.replace('R$ ', '').replace(',', '.'));
    const discount = product.subscriberDiscount;
    const discountedValue = priceValue * (1 - discount / 100);

    return {
      original: product.price,
      discounted: `R$ ${discountedValue.toFixed(2).replace('.', ',')}`,
      hasDiscount: true,
      percentOff: discount
    };
  };

  return (
    <section className="products-section" id="produtos">
      <div className="container">
        <h2 className="section__title">Nossos Produtos</h2>
        <p className="section__subtitle">
          {activeSubscription 
            ? 'Aproveite descontos exclusivos para assinantes!' 
            : 'Produtos de qualidade para seu cuidado pessoal'}
        </p>


        <div className="products-filter">
          {categories.map(category => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'filter-btn--active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>


        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <p className="products-empty">Nenhum produto disponível nesta categoria.</p>
          ) : (
            filteredProducts.map(product => {
              const priceInfo = calculatePrice(product);
              const isOutOfStock = product.stock === 0;
              const isLowStock = product.stock > 0 && product.stock <= 5;

              return (
                <div key={product.id} className={`product-card ${isOutOfStock ? 'product-card--out-of-stock' : ''}`}>
                
                  {priceInfo.hasDiscount && !isOutOfStock && (
                    <div className="product-badge product-badge--discount">
                      -{priceInfo.percentOff}% OFF
                    </div>
                  )}

                 
                  {isOutOfStock && (
                    <div className="product-badge product-badge--out">
                      Esgotado
                    </div>
                  )}
                  
                  {isLowStock && (
                    <div className="product-badge product-badge--low">
                      Últimas unidades
                    </div>
                  )}

           
                  <div className="product-card__image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="product-card__no-image">
                        <span>📦</span>
                      </div>
                    )}
                  </div>

                
                  <div className="product-card__info">
                    <span className="product-card__category">{product.category}</span>
                    <h3 className="product-card__name">{product.name}</h3>
                    
                    {product.description && (
                      <p className="product-card__description">{product.description}</p>
                    )}

                  
                    <div className="product-card__pricing">
                      {priceInfo.hasDiscount ? (
                        <>
                          <span className="product-card__price--original">{priceInfo.original}</span>
                          <span className="product-card__price--discounted">{priceInfo.discounted}</span>
                        </>
                      ) : (
                        <span className="product-card__price">{priceInfo.original}</span>
                      )}
                    </div>

                    <div className="product-card__stock">
                      <span className={`stock-indicator ${isOutOfStock ? 'stock-indicator--out' : isLowStock ? 'stock-indicator--low' : ''}`}>
                        {isOutOfStock ? 'Sem estoque' : `${product.stock} em estoque`}
                      </span>
                    </div>

                   
                    <button 
                      className="product-card__button"
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? 'Indisponível' : 'Disponível na Barbearia'}
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
              <h3> Quer descontos exclusivos?</h3>
              <p>Assinantes ganham descontos especiais em todos os produtos!</p>
              <button 
                className="products-cta__button"
                onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Conhecer Planos
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

ProductsSection.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      description: PropTypes.string,
      price: PropTypes.string.isRequired,
      subscriberDiscount: PropTypes.number,
      stock: PropTypes.number.isRequired,
      image: PropTypes.string
    })
  ).isRequired,
  activeSubscription: PropTypes.object
};