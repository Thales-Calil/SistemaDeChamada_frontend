import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth, getJson, lerErro } from '../api/fetchWithAuth.js'
import './Usuarios.css'

// Cadastro de logins (somente ADMIN). Os endpoints ficam no próprio API Gateway.
const USUARIOS_API = '/api/auth/usuarios'

const FORM_INICIAL = { username: '', password: '', role: 'ALUNO', referenciaId: '' }

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [alunos, setAlunos] = useState([])
  const [professores, setProfessores] = useState([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [listaUsuarios, listaAlunos, listaProfessores] = await Promise.all([
        getJson(USUARIOS_API, 'Não foi possível carregar os usuários.'),
        getJson('/api/alunos', 'Não foi possível carregar os alunos.'),
        getJson('/api/professores', 'Não foi possível carregar os professores.'),
      ])
      setUsuarios(listaUsuarios)
      setAlunos(listaAlunos)
      setProfessores(listaProfessores)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function alterarCampo(evento) {
    const { name, value } = evento.target
    setForm((atual) => ({ ...atual, [name]: value, ...(name === 'role' ? { referenciaId: '' } : {}) }))
  }

  async function criar(evento) {
    evento.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)
    try {
      const resposta = await fetchWithAuth(USUARIOS_API, {
        method: 'POST',
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          referenciaId: form.role === 'ADMIN' ? null : Number(form.referenciaId),
        }),
      })
      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, 'Não foi possível criar o usuário.'))
      }
      setForm(FORM_INICIAL)
      setMensagem('Usuário criado com sucesso!')
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(usuario) {
    setErro('')
    setMensagem('')
    const acao = usuario.ativo ? 'desativar' : 'ativar'
    const resposta = await fetchWithAuth(`${USUARIOS_API}/${usuario.id}/${acao}`, { method: 'PUT' })
    if (!resposta.ok) {
      setErro(await lerErro(resposta, `Não foi possível ${acao} o usuário.`))
      return
    }
    await carregar()
  }

  async function redefinirSenha(usuario) {
    const novaSenha = window.prompt(`Nova senha para ${usuario.username} (mínimo 8 caracteres):`)
    if (!novaSenha) return
    setErro('')
    setMensagem('')
    const resposta = await fetchWithAuth(`${USUARIOS_API}/${usuario.id}/senha`, {
      method: 'PUT',
      body: JSON.stringify({ novaSenha }),
    })
    if (!resposta.ok) {
      setErro(await lerErro(resposta, 'Não foi possível alterar a senha.'))
      return
    }
    setMensagem(`Senha de ${usuario.username} alterada.`)
  }

  function descreverVinculo(usuario) {
    if (usuario.role === 'ALUNO') {
      const aluno = alunos.find((a) => a.id === usuario.referenciaId)
      return aluno ? `${aluno.nome} (${aluno.matricula})` : `Aluno #${usuario.referenciaId}`
    }
    if (usuario.role === 'PROFESSOR') {
      const professor = professores.find((p) => p.id === usuario.referenciaId)
      return professor ? professor.nome : `Professor #${usuario.referenciaId}`
    }
    return '—'
  }

  const opcoesVinculo = form.role === 'ALUNO' ? alunos : form.role === 'PROFESSOR' ? professores : []

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <div>
          <h2>Usuários</h2>
          <p>Crie os logins de administradores, professores e alunos.</p>
        </div>
        <span className="usuarios-total">{usuarios.length} usuários</span>
      </div>

      {mensagem && <p className="usuarios-sucesso" role="status">{mensagem}</p>}
      {erro && <p className="usuarios-erro" role="alert">{erro}</p>}

      <form className="usuarios-form" onSubmit={criar}>
        <h3>Novo usuário</h3>
        <div className="usuarios-form-grid">
          <label>
            Usuário
            <input name="username" value={form.username} onChange={alterarCampo} required minLength={3} />
          </label>
          <label>
            Senha
            <input name="password" type="password" value={form.password} onChange={alterarCampo}
              required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Perfil
            <select name="role" value={form.role} onChange={alterarCampo}>
              <option value="ALUNO">Aluno</option>
              <option value="PROFESSOR">Professor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          {form.role !== 'ADMIN' && (
            <label>
              {form.role === 'ALUNO' ? 'Aluno' : 'Professor'}
              <select name="referenciaId" value={form.referenciaId} onChange={alterarCampo} required>
                <option value="">Selecione...</option>
                {opcoesVinculo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}{item.matricula ? ` (${item.matricula})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button type="submit" className="usuarios-botao" disabled={salvando}>
          {salvando ? 'Criando...' : 'Criar usuário'}
        </button>
      </form>

      {carregando ? (
        <p>Carregando usuários...</p>
      ) : (
        <table className="usuarios-tabela">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Vínculo</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className={usuario.ativo ? '' : 'inativo'}>
                <td>{usuario.username}</td>
                <td>{usuario.role}</td>
                <td>{descreverVinculo(usuario)}</td>
                <td>{usuario.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="usuarios-acoes">
                  <button type="button" onClick={() => redefinirSenha(usuario)}>Senha</button>
                  <button type="button" onClick={() => alternarAtivo(usuario)}>
                    {usuario.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Usuarios
