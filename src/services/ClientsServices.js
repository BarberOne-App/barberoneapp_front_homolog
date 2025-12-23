import api from "./api";

export async function getClientes() {
  const { data } = await api.get("/clientes");
  return data;
}

export async function createCliente(clienteData) {
  const { data } = await api.post("/clientes", clienteData);
  return data;
}

export async function updateCliente(id, clienteData) {
  const { data } = await api.put(`/clientes/${id}`, clienteData);
  return data;
}

export async function deleteCliente(id) {
  await api.delete(`/clientes/${id}`);
}