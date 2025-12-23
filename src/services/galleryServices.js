import { api } from "./api";

const BASE = "/gallery";

export async function getGallery() {
  const res = await api.get(BASE);
  return res.data;
}
