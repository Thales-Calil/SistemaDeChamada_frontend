const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('user_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    console.warn('Acesso não autorizado ou token expirado pelo Gateway.');
  }

  return response;
}