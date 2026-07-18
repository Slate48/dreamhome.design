// Thin fetch wrappers for the wl-dreamhome-api admin/invite endpoints. Same-origin,
// cookie session. Throws Error(server message) on non-2xx so callers can toast it.

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// tiers
export const listTiers = () => req('/api/admin/tiers');
export const createTier = (body) => req('/api/admin/tiers', { method: 'POST', body });
export const updateTier = (id, body) => req(`/api/admin/tiers/${id}`, { method: 'PATCH', body });
export const reorderTiers = (orderedIds) => req('/api/admin/tiers/reorder', { method: 'POST', body: { orderedIds } });
export const deleteTier = (id) => req(`/api/admin/tiers/${id}`, { method: 'DELETE' });

// users
export const listUsers = () => req('/api/admin/users');
export const inviteUser = (body) => req('/api/admin/users', { method: 'POST', body });
export const updateUser = (id, body) => req(`/api/admin/users/${id}`, { method: 'PATCH', body });
export const deleteUser = (id) => req(`/api/admin/users/${id}`, { method: 'DELETE' });
export const reinviteUser = (id) => req(`/api/admin/users/${id}/reinvite`, { method: 'POST' });

// invite acceptance + self
export const getInvite = (token) => req(`/api/auth/invite/${token}`);
export const acceptInvite = (token, password) => req(`/api/auth/invite/${token}`, { method: 'POST', body: { password } });
export const changePassword = (current_password, new_password) =>
  req('/api/auth/change-password', { method: 'POST', body: { current_password, new_password } });
export const changeEmail = (current_password, new_email) =>
  req('/api/auth/change-email', { method: 'POST', body: { current_password, new_email } });
