
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Usuário ou senha inválidos.');
  }

  const data = await response.json();

  // Armazena no localStorage para acesso compartilhado entre todos os MFEs
  localStorage.setItem('user_token', data.token);
  localStorage.setItem('user_role', data.role);
  localStorage.setItem('user_name', username);

  return data;
}

export function logout() {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  window.location.reload();
}

export function getUsuarioLogado() {
  return {
    token: localStorage.getItem('user_token'),
    role: localStorage.getItem('user_role'),
    username: localStorage.getItem('user_name')
  };
}
