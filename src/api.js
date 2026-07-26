export async function getSession() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) throw new Error('Sesi tidak dapat diperiksa.');
  return response.json();
}

export async function getConversations() {
  const response = await fetch('/api/conversations');
  if (!response.ok) throw new Error('Sejarah tidak dapat dimuatkan.');
  return response.json();
}

export async function getConversation(id) {
  const response = await fetch(`/api/conversations/${id}`);
  if (!response.ok) throw new Error('Perbualan tidak ditemui.');
  return response.json();
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}
