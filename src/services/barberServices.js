import api, { API_BASE_URL } from "./api";
import { getToken } from "./authService";


export async function getBarbers() {
  const { data } = await api.get("/barbers");
  return data.items;
}

export async function getBarberById(id) {
  const { data } = await api.get(`/barbers/${id}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return data;
}

export async function createBarber(barberData) {
  const { data } = await api.post("/barbers", barberData, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return data;
}

export async function updateBarber(id, barberData) {
  const { data } = await api.put(`/barbers/${id}`, barberData, {
     headers: {
        Authorization: `Bearer ${getToken()}`,
      },
  });
  return data;
}

export async function deleteBarber(id) {
  await api.delete(`/barbers/${id}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
}


export const linkBarberToUser = async (barberId, userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/barbers/${barberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ userId })
    });
    return await response.json();
  } catch (error) {

    throw error;
  }
};
