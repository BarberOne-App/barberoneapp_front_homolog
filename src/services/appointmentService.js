import api from "./api.js";

const BASE = "/appointments";


export async function getAppointments() {
  const res = await api.get(BASE);
  return res.data;
}


export async function getAppointmentsByBarberAndDate(barberId, date) {
  const res = await api.get(`${BASE}?barberId=${barberId}&date=${date}`);
  return res.data;
}


export async function createAppointment(data) {
  const res = await api.post(BASE, data);
  return res.data;
}


export async function deleteAppointment(id) {
  await api.delete(`${BASE}/${id}`);
  return true;
}

export async function updateAppointment(id, data) {
  const appointments = getAppointments();
  const index = appointments.findIndex(apt => apt.id === id);
  
  if (index !== -1) {
    appointments[index] = { ...appointments[index], ...data };
    localStorage.setItem('appointments', JSON.stringify(appointments));
    return appointments[index];
  }
  
  throw new Error('Agendamento não encontrado');
}