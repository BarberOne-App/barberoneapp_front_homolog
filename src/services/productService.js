import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'https://barberoneapp-back-homolog.onrender.com';
const token = getToken();
console.log("Token:", token);

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
    const response = await axios.get(`${API_URL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    const response = await axios.get(`${API_URL}/products/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const createProduct = async (productData) => {
  try {
    const response = await axios.post(`${API_URL}/products`, productData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const updateProduct = async (id, productData) => {
  try {
    const response = await axios.put(`${API_URL}/products/${id}`, productData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeProduct(response.data);
  } catch (error) {
    throw error;
  }
};


export const deleteProduct = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/products/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reactivateProduct = async (id) => {
  try {
    const response = await axios.patch(`${API_URL}/products/${id}/reactivate`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const updateProductStock = async (id, newStock) => {
  try {
    const response = await axios.patch(`${API_URL}/products/${id}`, {
      stock: newStock
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const importProducts = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/products/import`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
