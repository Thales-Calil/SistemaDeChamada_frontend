import { lazy, Suspense, useEffect, useState } from 'react'
import Login from './components/Login'
import Usuarios from './components/Usuarios'
import RemoteBoundary from './components/RemoteBoundary'
import { getUsuarioLogado, logout } from './services/authService.js'
import { EVENTO_SESSAO_ENCERRADA } from './api/fetchWithAuth.js'
import './App.css'

/** lazy() com novas tentativas: uma falha momentânea de rede ao baixar o remoteEntry.js não derruba a tela. */
function lazyRemoto(importar, tentativas = 2) {
  return lazy(async () => {
    let ultimoErro
    for (let i = 0; i <= tentativas; i++) {
      try {
        return await importar()
      } catch (erro) {
        ultimoErro = erro
        await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)))
      }
    }
    throw ultimoErro
  })
}

// Componentes remotos carregados via Module Federation (gerenciados exclusivamente pelo Host)
const Alunos = lazyRemoto(() => import('alunos/Alunos'))
const Chamadas = lazyRemoto(() => import('chamadas/Chamadas'))
const RegistroPresenca = lazyRemoto(() => import('registroPresenca/RegistroPresenca'))

// Abas visíveis por perfil (o backend aplica as mesmas regras; aqui só escondemos o que não se pode usar)
const ABAS_POR_PERFIL = {
  ADMIN: ['chamadas', 'alunos', 'usuarios'],
  PROFESSOR: ['chamadas', 'alunos'],
  ALUNO: ['meus-dados'],
}

const ROTULOS = {
  chamadas: 'Chamadas',
  alunos: 'Alunos',
  usuarios: 'Usuários',
  'meus-dados': 'Meus dados',
}

const PERFIS = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
}

function App() {
  const [usuario, setUsuario] = useState(() => getUsuarioLogado())
  const [aviso, setAviso] = useState('')
  const [abaAtiva, setAbaAtiva] = useState(null)

  // Qualquer MFE que receba 401 (ou o logout) dispara este evento -> volta para o login
  useEffect(() => {
    function aoEncerrar(evento) {
      setUsuario(null)
      setAbaAtiva(null)
      setAviso(evento.detail?.motivo === 'expirada' ? 'Sua sessão expirou. Faça login novamente.' : '')
    }
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar)
    return () => window.removeEventListener(EVENTO_SESSAO_ENCERRADA, aoEncerrar)
  }, [])

  // Encerra a sessão automaticamente quando o token vencer
  useEffect(() => {
    if (!usuario?.expiraEm) return undefined
    const restante = usuario.expiraEm - Date.now()
    if (restante <= 0) {
      logout('expirada')
      return undefined
    }
    const timer = setTimeout(() => logout('expirada'), restante)
    return () => clearTimeout(timer)
  }, [usuario])

  if (!usuario) {
    return (
      <Login
        aviso={aviso}
        onLoginSucesso={() => {
          setAviso('')
          setUsuario(getUsuarioLogado())
        }}
      />
    )
  }

  const abas = ABAS_POR_PERFIL[usuario.role] || []
  const aba = abas.includes(abaAtiva) ? abaAtiva : abas[0]
  const dadosUsuario = { username: usuario.username, role: usuario.role, referenciaId: usuario.referenciaId }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-titulo">
          <h1>Sistema de Gestão Escolar</h1>
          <p>Controle de chamadas e frequência</p>
        </div>

        <div className="user-info">
          <div className="user-dados">
            <strong>{usuario.username}</strong>
            <span className={`perfil-badge perfil-${usuario.role?.toLowerCase()}`}>
              {PERFIS[usuario.role] || usuario.role}
            </span>
          </div>
          <button type="button" className="botao-sair" onClick={() => logout('logout')}>
            Sair
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Seções do sistema">
        {abas.map((item) => (
          <button
            key={item}
            type="button"
            className={item === aba ? 'active' : ''}
            aria-current={item === aba ? 'page' : undefined}
            onClick={() => setAbaAtiva(item)}
          >
            {ROTULOS[item]}
          </button>
        ))}
      </nav>

      <main className="content">
        {aba === 'usuarios' ? (
          <Usuarios />
        ) : (
          <RemoteBoundary key={aba} nome={ROTULOS[aba]}>
            <Suspense fallback={<div className="carregando-mfe">Carregando módulo...</div>}>
              {aba === 'chamadas' && <Chamadas RegistroPresenca={RegistroPresenca} usuario={dadosUsuario} />}
              {(aba === 'alunos' || aba === 'meus-dados') && <Alunos usuario={dadosUsuario} />}
            </Suspense>
          </RemoteBoundary>
        )}
      </main>
    </div>
  )
}

export default App
