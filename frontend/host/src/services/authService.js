import { CHAVE_SESSAO, encerrarSessao, getSessao } from '../api/fetchWithAuth.js'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

export async function login(username, password) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao API Gateway.')
  }

  if (response.status === 401) {
    throw new Error('Usuário ou senha inválidos.')
  }
  if (!response.ok) {
    throw new Error(`Erro ao autenticar (HTTP ${response.status}).`)
  }

  const data = await response.json()

  // Sessão compartilhada com os MFEs. expiraEm permite voltar ao login quando o token vencer.
  sessionStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({
      token: data.token,
      role: data.role,
      username: data.username || username,
      userId: data.userId,
      referenciaId: data.referenciaId ?? null,
      expiraEm: Date.now() + (data.expiresIn || 0) * 1000,
    })
  )

  // limpa a sessão antiga (versão anterior guardava no localStorage)
  localStorage.removeItem('user_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')

  return data
}

export function logout(motivo = 'logout') {
  encerrarSessao(motivo)
}

/** Usuário logado ou null (sessão ausente ou expirada). */
export function getUsuarioLogado() {
  return getSessao()
}
