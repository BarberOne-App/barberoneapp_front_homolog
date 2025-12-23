import api from "./api";

export async function login(email, password) {
  const { data } = await api.get("/users", {
    params: { email, password }
  });

  if (data.length === 0) return null;
  return data[0]; 
}

export async function register(userData) {
  const { data } = await api.post("/users", userData);
  return data;
}

export function saveSession(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getSession() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

export function logout() {
  localStorage.removeItem("currentUser");
}
