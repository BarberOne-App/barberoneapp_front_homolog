import api from "./api";

export async function getPixKey() {
  try {
    const { data } = await api.get("/settings/1");
    return data;
  } catch (error) {
    return { pixKey: '' };
  }
}

export async function savePixKey(pixKey) {
  try {
    const { data } = await api.put("/settings/1", { id: 1, pixKey });
    return data;
  } catch (error) {
    const { data } = await api.post("/settings", { id: 1, pixKey });
    return data;
  }
}
