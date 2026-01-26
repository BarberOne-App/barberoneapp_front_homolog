import api from "./api";

export async function getBarbers() {
  const { data } = await api.get("/barbers");
  return data;
}

export async function getBarberById(id) {
  const { data } = await api.get(`/barbers/${id}`);
  return data;
}

export async function createBarber(barberData) {
  const { data } = await api.post("/barbers", barberData);
  return data;
}

export async function updateBarber(id, barberData) {
  const { data } = await api.put(`/barbers/${id}`, barberData);
  return data;
}

export async function deleteBarber(id) {
  await api.delete(`/barbers/${id}`);
}


export const linkBarberToUser = async (barberId, userId) => {
  try {
    const response = await fetch(`${API_BASE}/barbers/${barberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return await response.json();
  } catch (error) {

    throw error;
  }
};
