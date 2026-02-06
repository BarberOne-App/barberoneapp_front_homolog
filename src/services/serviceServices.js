import api from "./api.js";

const BASE = "/services";


export async function getAllServices() {
  const res = await api.get(BASE);
  return res.data;
}


export async function getServiceById(id) {
  const res = await api.get(`${BASE}/${id}`);
  return res.data;
}


export async function createService(serviceData) {
  const res = await api.post(BASE, serviceData);
  return res.data;
}


export async function updateService(id, serviceData) {
  const res = await api.put(`${BASE}/${id}`, serviceData);
  return res.data;
}


export async function deleteService(id) {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
}
