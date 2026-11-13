import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth, getJson, getUsuario, lerErro } from '../api/fetchWithAuth'
import './Alunos.css'

// Endpoints unificados no API Gateway
const API_URL = '/api/alunos'
const TURMAS_API = '/api/turmas'
const PRESENCAS_API = '/api/presencas'

const FORMULARIO_INICIAL = {
  nome: '',
  matricula: '',
  email: '',
}

/**
 * ADMIN     -> todos os alunos, cadastro/edição/exclusão e matrícula nas turmas
 * PROFESSOR -> somente os alunos das suas turmas (somente leitura)
 * ALUNO     -> somente os próprios dados e a frequência em cada turma
 * O usuário vem do Host (prop); fora do Host, lê da sessão.
 */
function Alunos({ usuario: usuarioProp }) {
  const usuario = usuarioProp || getUsuario()

  if (!usuario) {
    return <p className="mensagem-erro">Faça login para ver os alunos.</p>
  }
  if (usuario.role === 'ALUNO') {
    return <MeusDados alunoId={usuario.referenciaId} />
  }
  return <GestaoAlunos ehAdmin={usuario.role === 'ADMIN'} />
}

// =====================================================================================
// ADMIN e PROFESSOR
// =====================================================================================
function GestaoAlunos({ ehAdmin }) {
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [matriculados, setMatriculados] = useState([])
  const [somenteDaTurma, setSomenteDaTurma] = useState(!ehAdmin)
  const [frequencias, setFrequencias] = useState([])

  // 1. Turmas (o backend já devolve só as do professor)
  useEffect(() => {
    async function carregarTurmas() {
      try {
        const dados = await getJson(TURMAS_API, 'Não foi possível carregar as turmas.')
        setTurmas(dados)
        if (dados.length > 0) {
          setTurmaSelecionada(String(dados[0].id))
        } else if (!ehAdmin) {
          setCarregando(false)
        }
      } catch (e) {
        setErro(e.message)
        setCarregando(false)
      }
    }
    carregarTurmas()
  }, [ehAdmin])

  // 2. Alunos: ADMIN vê todos; PROFESSOR vê os matriculados na turma selecionada
  const buscarAlunos = useCallback(async () => {
    try {
      setErro('')
      if (ehAdmin) {
        setAlunos(await getJson(API_URL, 'Não foi possível carregar os alunos.'))
        return
      }
      if (!turmaSelecionada) return
      const ids = await getJson(`${TURMAS_API}/${turmaSelecionada}/alunos`, 'Não foi possível carregar os alunos da turma.')
      setAlunos(ids.length === 0 ? [] : await getJson(`${API_URL}?ids=${ids.join(',')}`, 'Não foi possível carregar os alunos.'))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [ehAdmin, turmaSelecionada])

  useEffect(() => {
    buscarAlunos()
  }, [buscarAlunos])

  // 3. Matrículas e frequências da turma selecionada
  const carregarDadosDaTurma = useCallback(async () => {
    if (!turmaSelecionada) {
      setMatriculados([])
      setFrequencias([])
      return
    }
    try {
      const [ids, freq] = await Promise.all([
        getJson(`${TURMAS_API}/${turmaSelecionada}/alunos`, 'Erro ao carregar matrículas.'),
        getJson(`${PRESENCAS_API}/turma/${turmaSelecionada}`, 'Erro ao carregar frequências.'),
      ])
      setMatriculados(ids)
      setFrequencias(freq)
    } catch (e) {
      console.error('Erro ao carregar dados da turma:', e)
      setMatriculados([])
      setFrequencias([])
    }
  }, [turmaSelecionada])

  useEffect(() => {
    carregarDadosDaTurma()
  }, [carregarDadosDaTurma])

  function abrirCadastro() {
    setAlunoEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro('')
    setMensagem('')
    setFormularioAberto(true)
  }

  function abrirEdicao(aluno) {
    setAlunoEditando(aluno)
    setFormulario({ nome: aluno.nome, matricula: aluno.matricula, email: aluno.email })
    setErro('')
    setMensagem('')
    setFormularioAberto(true)
  }

  function fecharFormulario() {
    setFormularioAberto(false)
    setAlunoEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro('')
  }

  function atualizarCampo(event) {
    const { name, value } = event.target
    setFormulario((atual) => ({ ...atual, [name]: value }))
  }

  // 4. Salvar (POST / PUT) - somente ADMIN
  async function salvarAluno(event) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)

    const editando = alunoEditando !== null
    const url = editando ? `${API_URL}/${alunoEditando.id}` : API_URL

    try {
      const resposta = await fetchWithAuth(url, {
        method: editando ? 'PUT' : 'POST',
        body: JSON.stringify(formulario),
      })
      if (!resposta.ok) {
        throw new Error(await lerErro(resposta,
          `Não foi possível ${editando ? 'editar' : 'cadastrar'} o aluno. Verifique os dados e tente novamente.`))
      }
      fecharFormulario()
      setMensagem(editando ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!')
      await buscarAlunos()
    } catch (error) {
      setErro(error.message || 'Ocorreu um erro ao salvar o aluno.')
    } finally {
      setSalvando(false)
    }
  }

  // 5. Excluir (DELETE) - somente ADMIN
  async function excluirAluno(aluno) {
    if (!window.confirm(`Tem certeza que deseja excluir o aluno ${aluno.nome}?`)) return
    setErro('')
    setMensagem('')
    try {
      const resposta = await fetchWithAuth(`${API_URL}/${aluno.id}`, { method: 'DELETE' })
      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, 'Não foi possível excluir o aluno.'))
      }
      setMensagem('Aluno excluído com sucesso!')
      await buscarAlunos()
    } catch (error) {
      setErro(error.message)
    }
  }

  // 6. Matricular / remover da turma selecionada - somente ADMIN
  async function alternarMatricula(aluno) {
    if (!turmaSelecionada) return
    setErro('')
    setMensagem('')
    const matriculado = matriculados.includes(aluno.id)
    try {
      const resposta = matriculado
        ? await fetchWithAuth(`${TURMAS_API}/${turmaSelecionada}/alunos/${aluno.id}`, { method: 'DELETE' })
        : await fetchWithAuth(`${TURMAS_API}/${turmaSelecionada}/alunos`, {
            method: 'POST',
            body: JSON.stringify({ alunoId: aluno.id }),
          })
      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, 'Não foi possível alterar a matrícula.'))
      }
      setMensagem(matriculado ? `${aluno.nome} removido da turma.` : `${aluno.nome} matriculado na turma.`)
      await carregarDadosDaTurma()
    } catch (error) {
      setErro(error.message)
    }
  }

  const turmaAtual = turmas.find((t) => String(t.id) === turmaSelecionada)
  const alunosVisiveis = ehAdmin && somenteDaTurma
    ? alunos.filter((a) => matriculados.includes(a.id))
    : alunos

  return (
    <div className="alunos-container">
      <div className="alunos-header">
        <div>
          <h2>Alunos</h2>
          <p>
            {ehAdmin
              ? 'Gerencie os alunos e as matrículas nas turmas.'
              : 'Alunos matriculados nas suas turmas.'}
          </p>
        </div>

        <div className="alunos-header-acoes">
          <span className="total-alunos">{alunosVisiveis.length} alunos</span>
          {ehAdmin && (
            <button type="button" className="botao-principal" onClick={abrirCadastro}>
              + Cadastrar aluno
            </button>
          )}
        </div>
      </div>

      {mensagem && <p className="mensagem-sucesso" role="status">{mensagem}</p>}
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}

      {ehAdmin && formularioAberto && (
        <div className="formulario-card">
          <div className="formulario-header">
            <h3>{alunoEditando ? 'Editar aluno' : 'Cadastrar aluno'}</h3>
            <button type="button" className="botao-fechar" onClick={fecharFormulario} aria-label="Fechar formulário">
              ×
            </button>
          </div>

          <form onSubmit={salvarAluno}>
            <div className="campo-formulario">
              <label htmlFor="nome">Nome completo</label>
              <input id="nome" name="nome" type="text" value={formulario.nome} onChange={atualizarCampo}
                placeholder="Digite o nome do aluno" required />
            </div>

            <div className="campo-formulario">
              <label htmlFor="matricula">Matrícula</label>
              <input id="matricula" name="matricula" type="text" value={formulario.matricula} onChange={atualizarCampo}
                placeholder="Digite a matrícula" required />
            </div>

            <div className="campo-formulario">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" value={formulario.email} onChange={atualizarCampo}
                placeholder="aluno@email.com" required />
            </div>

            <div className="formulario-acoes">
              <button type="button" className="botao-secundario" onClick={fecharFormulario} disabled={salvando}>
                Cancelar
              </button>
              <button type="submit" className="botao-principal" disabled={salvando}>
                {salvando ? 'Salvando...' : alunoEditando ? 'Salvar alterações' : 'Cadastrar aluno'}
              </button>
            </div>
          </form>
        </div>
      )}

      {turmas.length > 0 && (
        <div className="filtro-frequencia">
          <label htmlFor="turmaFrequencia">Turma:</label>
          <select id="turmaFrequencia" value={turmaSelecionada}
            onChange={(event) => setTurmaSelecionada(event.target.value)}>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome} — {turma.disciplinaNome}
              </option>
            ))}
          </select>

          {ehAdmin && (
            <label className="filtro-checkbox">
              <input type="checkbox" checked={somenteDaTurma} onChange={(e) => setSomenteDaTurma(e.target.checked)} />
              Somente alunos desta turma
            </label>
          )}
        </div>
      )}

      {carregando && <p>Carregando alunos...</p>}

      {!carregando && !ehAdmin && turmas.length === 0 && !erro && (
        <p>Você ainda não tem turmas atribuídas.</p>
      )}

      {!carregando && !erro && alunosVisiveis.length === 0 && (ehAdmin || turmas.length > 0) && (
        <p>{ehAdmin && !somenteDaTurma ? 'Nenhum aluno cadastrado.' : 'Nenhum aluno matriculado nesta turma.'}</p>
      )}

      {!carregando && alunosVisiveis.length > 0 && (
        <div className="alunos-grid">
          {alunosVisiveis.map((aluno) => {
            const frequencia = frequencias.find((item) => item.alunoId === aluno.id)
            const matriculado = matriculados.includes(aluno.id)

            return (
              <div className="aluno-card" key={aluno.id}>
                <div className="aluno-avatar">{aluno.nome?.charAt(0).toUpperCase() || '?'}</div>

                <div className="aluno-info">
                  <h3>{aluno.nome}</h3>
                  <span>Matrícula: {aluno.matricula}</span>
                  <span className="aluno-email">{aluno.email}</span>
                  {ehAdmin && turmaAtual && (
                    <span className={`aluno-turma-tag ${matriculado ? 'matriculado' : ''}`}>
                      {matriculado ? `Matriculado em ${turmaAtual.nome}` : `Fora de ${turmaAtual.nome}`}
                    </span>
                  )}
                </div>

                <div className="presenca">
                  <span>Frequência</span>
                  {!frequencia ? (
                    <strong>Sem dados</strong>
                  ) : (
                    <strong className={frequencia.alertaRiscoReprovacao ? 'frequencia-baixa' : 'frequencia-aprovada'}>
                      {frequencia.percentual.toFixed(1)}%
                    </strong>
                  )}

                  {ehAdmin && (
                    <>
                      {turmaAtual && (
                        <button type="button" className={`botao-matricula ${matriculado ? 'remover' : ''}`}
                          onClick={() => alternarMatricula(aluno)}>
                          {matriculado ? 'Remover da turma' : 'Matricular'}
                        </button>
                      )}
                      <button type="button" className="botao-editar" onClick={() => abrirEdicao(aluno)}>
                        Editar
                      </button>
                      <button type="button" className="botao-excluir" onClick={() => excluirAluno(aluno)}>
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =====================================================================================
// ALUNO: somente os próprios dados
// =====================================================================================
function MeusDados({ alunoId }) {
  const [aluno, setAluno] = useState(null)
  const [frequencias, setFrequencias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [dados, freq] = await Promise.all([
          getJson(`${API_URL}/${alunoId}`, 'Não foi possível carregar seus dados.'),
          getJson(`${PRESENCAS_API}/aluno/${alunoId}`, 'Não foi possível carregar sua frequência.'),
        ])
        setAluno(dados)
        setFrequencias(freq)
      } catch (e) {
        setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }
    if (alunoId) {
      carregar()
    } else {
      setErro('Seu login não está vinculado a um aluno. Procure a secretaria.')
      setCarregando(false)
    }
  }, [alunoId])

  if (carregando) return <div className="alunos-container"><p>Carregando seus dados...</p></div>

  return (
    <div className="alunos-container">
      <div className="alunos-header">
        <div>
          <h2>Meus dados</h2>
          <p>Seus dados cadastrais e sua frequência em cada disciplina.</p>
        </div>
      </div>

      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}

      {aluno && (
        <div className="meus-dados-card">
          <div className="aluno-avatar">{aluno.nome?.charAt(0).toUpperCase() || '?'}</div>
          <div className="aluno-info">
            <h3>{aluno.nome}</h3>
            <span>Matrícula: {aluno.matricula}</span>
            <span className="aluno-email">{aluno.email}</span>
          </div>
        </div>
      )}

      {!erro && frequencias.length === 0 && <p>Você ainda não está matriculado em nenhuma turma.</p>}

      {frequencias.length > 0 && (
        <table className="frequencia-tabela">
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Turma</th>
              <th>Presenças</th>
              <th>Faltas</th>
              <th>Frequência</th>
            </tr>
          </thead>
          <tbody>
            {frequencias.map((f) => (
              <tr key={f.turmaId}>
                <td>{f.disciplinaNome || '—'}</td>
                <td>{f.turmaNome}</td>
                <td>{f.totalPresencas} de {f.totalChamadas}</td>
                <td>{f.faltas}</td>
                <td>
                  <strong className={f.alertaRiscoReprovacao ? 'frequencia-baixa' : 'frequencia-aprovada'}>
                    {f.percentual.toFixed(1)}%
                  </strong>
                  {f.alertaRiscoReprovacao && <span className="alerta-frequencia">abaixo de 75%</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Alunos
