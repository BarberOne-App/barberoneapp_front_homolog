import api from "./api.js";

const BASE = "/services";

export async function getAllServices() {
  const res = await api.get(BASE);
  return res.data;
}