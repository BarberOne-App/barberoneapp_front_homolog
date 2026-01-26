import axios from 'axios';

const API_URL = 'http://localhost:3000';


export const getProducts = async () => {
  try {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const getProductById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const createProduct = async (productData) => {
  try {
    const response = await axios.post(`${API_URL}/products`, productData);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const updateProduct = async (id, productData) => {
  try {
    const response = await axios.put(`${API_URL}/products/${id}`, productData);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const deleteProduct = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const updateProductStock = async (id, newStock) => {
  try {
    const response = await axios.patch(`${API_URL}/products/${id}`, {
      stock: newStock
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};