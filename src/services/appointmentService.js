import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'https://barbearia-addev-backend.onrender.com';


export const getAppointments = async () => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_URL}/appointments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.items;
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    throw error;
  }
};


export const createAppointment = async (appointmentData) => {
  const token = getToken();
  try {
    const response = await axios.post(`${API_URL}/appointments`, appointmentData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    throw error;
  }
};


export const updateAppointment = async (id, updatedData) => {
  const token = getToken();
  try {
    const response = await axios.patch(`${API_URL}/appointments/${id}`, updatedData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    throw error;
  }
};


export const deleteAppointment = async (id) => {
  const token = getToken();
  try {
    const response = await axios.delete(`${API_URL}/appointments/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    throw error;
  }
};

export const getAppointmentsByBarber = async (barberId) => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_URL}/appointments?barberId=${barberId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data?.items ?? [];
  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error);
    throw error;
  }
};


export const getAppointmentsByClient = async (clientId) => {
  const token = getToken();
  try {
    const response = await axios.get(`${API_URL}/appointments?clientId=${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data?.items ?? [];
  } catch (error) {
    console.error('Erro ao buscar agendamentos do cliente:', error);
    throw error;
  }
};
