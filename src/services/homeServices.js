import api from "./api";


export async function getServices() {
  const { data } = await api.get("/services");
  return data;
}


export async function getGallery() {
  const { data } = await api.get("/gallery");
  return data;
}


export async function createGalleryImage(imageData) {
  const { data } = await api.post("/gallery", imageData);
  return data;
}


export async function updateGalleryImage(imageId, imageData) {
  const { data } = await api.put(`/gallery/${imageId}`, imageData);
  return data;
}


export async function deleteGalleryImage(imageId) {
  const { data } = await api.delete(`/gallery/${imageId}`);
  return data;
}