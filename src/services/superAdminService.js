import api from './api';

export async function getSuperAdminDashboard() {
  const { data } = await api.get('/super-admin/dashboard');
  return data;
}

export async function getAllBarbershops(params = {}) {
  const { data } = await api.get('/super-admin/barbershops', { params });
  return data;
}

export async function getBarbershopDetails(id) {
  const { data } = await api.get(`/super-admin/barbershops/${id}`);
  return data;
}

export async function getBarbershopUsers(id) {
  const { data } = await api.get(`/super-admin/barbershops/${id}/users`);
  return data;
}

export async function updateBarbershopStatus(id, status, reason = null) {
  const { data } = await api.patch(`/super-admin/barbershops/${id}/status`, {
    status,
    reason,
  });
  return data;
}

export async function resetUserPassword(userId, newPassword = undefined) {
  const body = {};
  if (newPassword !== undefined) body.newPassword = newPassword;
  const { data } = await api.patch(`/super-admin/users/${userId}/password`, body);
  return data;
}
