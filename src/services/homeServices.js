import api from "./api";


export async function getServices() {
  const { data } = await api.get("/services");
  return data;
}


export async function getGallery() {
  const { data } = await api.get("/gallery");
  return data;
}
