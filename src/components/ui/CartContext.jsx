import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Carregar carrinho do localStorage ao iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Salvar carrinho no localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const parsePrice = (price) => {
    if (!price) return 0;
    return Number(
      price.replace('R$', '').replace('.', '').replace(',', '.').trim()
    );
  };

  const addProduct = (product, quantity = 1) => {
    setCartItems((prev) => {
      const existingItem = prev.find(
        (item) => item.type === 'product' && item.id === product.id
      );

      if (existingItem) {
        return prev.map((item) =>
          item.type === 'product' && item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        {
          type: 'product',
          id: product.id,
          name: product.name,
          price: parsePrice(product.price),
          priceFormatted: product.price,
          quantity,
          image: product.image,
        },
      ];
    });
  };

  const removeProduct = (productId) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.type === 'product' && item.id === productId))
    );
  };

  const updateProductQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.type === 'product' && item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const setService = (serviceData) => {
    setSelectedService(serviceData);
    
    // Remove serviço anterior do carrinho e adiciona o novo
    setCartItems((prev) => {
      const withoutService = prev.filter((item) => item.type !== 'service');
      
      if (!serviceData) return withoutService;

      const totalServicePrice = serviceData.services.reduce(
        (sum, s) => sum + parsePrice(s.price),
        0
      );

      return [
        ...withoutService,
        {
          type: 'service',
          id: `service-${Date.now()}`,
          barberName: serviceData.barberName,
          services: serviceData.services,
          time: serviceData.time,
          price: totalServicePrice,
          priceFormatted: `R$ ${totalServicePrice.toFixed(2).replace('.', ',')}`,
        },
      ];
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedService(null);
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + item.price * (item.quantity || 1);
    }, 0);
  };

  const getTotalFormatted = () => {
    const total = getTotal();
    return `R$ ${total.toFixed(2).replace('.', ',')}`;
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => {
      return count + (item.quantity || 1);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        selectedService,
        addProduct,
        removeProduct,
        updateProductQuantity,
        setService,
        clearCart,
        getTotal,
        getTotalFormatted,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
