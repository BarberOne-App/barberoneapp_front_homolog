import api from './api';

const normalizeProduct = (product) => {
  if (!product || typeof product !== 'object') return product;

  return {
    ...product,
    name: product.name ?? '',
    description: product.description ?? '',
    category: product.category ?? '',
    price: product.price ?? 0,
    stock: product.stock ?? 0,
    active: product.active ?? true,
    subscriberDiscount:
      product.subscriberDiscount ?? product.subscriber_discount ?? product.subscriberdiscount ?? 0,
    imageUrl: product.imageUrl ?? product.image_url ?? product.image ?? '',
    image: product.image ?? product.image_url ?? product.imageUrl ?? '',
  };
};

const getProductsParams = (includeInactive = false) => (
  includeInactive ? { includeInactive: 'true' } : {}
);

export const getProducts = async (includeInactive = false) => {
  try {
    const response = await api.get('/products', {
      params: getProductsParams(includeInactive),
    });
    const data = response.data.items || response.data;
    return Array.isArray(data)
      ? data.map(normalizeProduct)
      : normalizeProduct(data);
  } catch (error) {
    throw error;
  }
};


export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const createProduct = async (productData) => {
  try {
    const response = await api.post('/products', productData);
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const updateProduct = async (id, productData) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reactivateProduct = async (id) => {
  try {
    const response = await api.patch(`/products/${id}/reactivate`, null);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const updateProductStock = async (id, newStock) => {
  try {
    const response = await api.patch(`/products/${id}`, {
      stock: newStock
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const importProducts = async (data) => {
  try {
    const response = await api.post('/products/import', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
