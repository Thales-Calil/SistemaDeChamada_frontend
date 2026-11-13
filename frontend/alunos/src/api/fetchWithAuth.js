// Cliente HTTP compartilhado (cópia idêntica no host e em cada microfrontend).
// Todas as chamadas passam pelo API Gateway com o JWT da sessão.
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

// A sessão fica no sessionStorage (some ao fechar a aba) e é compartilhada por host e MFEs,
// porque todos rodam na mesma página/origem.
export const CHAVE_SESSAO = 'sessao_sistema_chamadas'
export const EVENTO_SESSAO_ENCERRADA = 'sessao-encerrada'

export function getSessao() {
  try {
    const sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO))
    if (!sessao?.token) return null
    if (sessao.expiraEm && Date.now() >= sessao.expiraEm) return null
    return sessao
  } catch {
    return null
  }
}

/** Dados do usuário logado: { username, role, referenciaId }. Só para decidir o que MOSTRAR; quem protege é o backend. */
export function getUsuario() {
  const sessao = getSessao()
  return sessao
    ? { username: sessao.username, role: sessao.role, referenciaId: sessao.referenciaId }
    : null
}

/** Apaga a sessão e avisa o host para voltar à tela de login. */
export function encerrarSessao(motivo = 'logout') {
  sessionStorage.removeItem(CHAVE_SESSAO)
  window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_ENCERRADA, { detail: { motivo } }))
}

export async function fetchWithAuth(endpoint, options = {}) {
  const sessao = getSessao()
  if (!sessao) {
    encerrarSessao('expirada')
    throw new Error('Sua sessão expirou. Faça login novamente.')
  }

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${sessao.token}`,
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
  } catch {
    throw new Error('Não foi possível conectar ao API Gateway. Verifique sua conexão ou se o serviço está no ar.')
  }

  // Token vencido ou inválido: volta para o login em vez de mostrar erros genéricos
  if (response.status === 401) {
    encerrarSessao('expirada')
  }

  return response
}

/** Lê a mensagem de erro que o backend devolve ({ mensagem, servico, ... }). */
export async function lerErro(resposta, padrao = 'Ocorreu um erro inesperado.') {
  try {
    const texto = await resposta.text()
    if (!texto) return padrao
    try {
      const json = JSON.parse(texto)
      return json.mensagem || json.message || json.detail || json.error || padrao
    } catch {
      return texto.length < 300 ? texto : padrao
    }
  } catch {
    return padrao
  }
}

/** GET que devolve JSON ou lança Error com a mensagem do backend. */
export async function getJson(endpoint, padraoErro) {
  const resposta = await fetchWithAuth(endpoint)
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta, padraoErro))
  }
  return resposta.json()
}
