import axios from 'axios';

const API_URL = 'http://localhost:3000'; 


export const getAppointments = async () => {
  try {
    const response = await axios.get(`${API_URL}/appointments`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    throw error;
  }
};


export const createAppointment = async (appointmentData) => {
  try {
    const response = await axios.post(`${API_URL}/appointments`, appointmentData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    throw error;
  }
};


export const updateAppointment = async (id, updatedData) => {
  try {
    const response = await axios.put(`${API_URL}/appointments/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    throw error;
  }
};


export const deleteAppointment = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    throw error;
  }
};

export const getAppointmentsByBarber = async (barberId) => {
  try {
    const response = await axios.get(`${API_URL}/appointments?barberId=${barberId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error);
    throw error;
  }
};


export const getAppointmentsByClient = async (clientId) => {
  try {
    const response = await axios.get(`${API_URL}/appointments?clientId=${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar agendamentos do cliente:', error);
    throw error;
  }
};
