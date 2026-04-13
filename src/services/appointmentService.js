import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'https://barberoneapp-back-homolog.onrender.com';


export const getAppointments = async () => {
  const token = getToken();
  try {
    const limit = 100;
    let page = 1;
    let allItems = [];

    while (true) {
      const response = await axios.get(
        `${API_URL}/appointments?allAppointments=true&page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      allItems = allItems.concat(items);

      const total = Number(response.data?.total ?? allItems.length);
      if (items.length < limit || allItems.length >= total) {
        break;
      }

      page += 1;
    }

    return allItems;
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    throw error;
  }
};


export const createAppointment = async (appointmentData) => {
  const token = getToken();
  try {
    const normalizedServices = Array.isArray(appointmentData?.services)
      ? appointmentData.services.map((service) => {
          const duration = Number(
            service?.duration ?? service?.durationMinutes ?? service?.duration_minutes ?? 30,
          );

          return {
            ...service,
            duration: Number.isFinite(duration) && duration > 0 ? duration : 30,
          };
        })
      : [];

    const payload = {
      ...appointmentData,
      services: normalizedServices,
    };

    const response = await axios.post(`${API_URL}/appointments`, payload, {
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
