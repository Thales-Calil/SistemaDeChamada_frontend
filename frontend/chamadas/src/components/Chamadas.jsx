import { Suspense, useCallback, useEffect, useState } from 'react'
import { fetchWithAuth, getJson, getUsuario, lerErro } from '../api/fetchWithAuth'
import './Chamadas.css'

// Rotas unificadas no Gateway
const TURMAS_API = '/api/turmas'
const CHAMADAS_API = '/api/chamadas'

function dataAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function horarioAtual() {
  const agora = new Date()
  const horas = String(agora.getHours()).padStart(2, '0')
  const minutos = String(agora.getMinutes()).padStart(2, '0')
  return `${horas}:${minutos}`
}

function formatarData(data) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function traduzirStatus(status) {
  if (status === 'FINALIZADA') return 'Presença registrada'
  if (status === 'ABERTA') return 'Em andamento'
  return status || 'Indefinido'
}

/**
 * ADMIN: chamadas de todas as turmas | PROFESSOR: só das suas turmas (o backend filtra).
 * ALUNO não acessa esta tela (o Host não mostra a aba e o Gateway bloqueia).
 */
function Chamadas({ RegistroPresenca, usuario: usuarioProp }) {
  const usuario = usuarioProp || getUsuario()
  const podeGerenciar = usuario?.role === 'ADMIN' || usuario?.role === 'PROFESSOR'

  const [turmas, setTurmas] = useState([])
  const [aulas, setAulas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aulaSelecionada, setAulaSelecionada] = useState(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [turmaId, setTurmaId] = useState('')
  const [data, setData] = useState(dataAtual())
  const [horario, setHorario] = useState(horarioAtual())

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setErro('')

    try {
      const dadosTurmas = await getJson(TURMAS_API, 'Não foi possível carregar as turmas.')
      setTurmas(dadosTurmas)

      const chamadasPorTurma = await Promise.all(
        dadosTurmas.map(async (turma) => {
          const chamadasTurma = await getJson(
            `${CHAMADAS_API}/turma/${turma.id}`,
            `Não foi possível carregar as chamadas da turma ${turma.nome}.`
          )
          return chamadasTurma.map((chamada) => ({
            ...chamada,
            turmaId: turma.id,
            turmaNome: turma.nome,
            disciplina: turma.disciplinaNome,
            professor: turma.professorNome,
            dataIso: chamada.data,
            data: formatarData(chamada.data),
            horario: chamada.horario?.slice(0, 5) || '',
            statusOriginal: chamada.status,
            status: traduzirStatus(chamada.status),
          }))
        })
      )

      // mais recentes primeiro
      setAulas(chamadasPorTurma.flat().sort((a, b) =>
        `${b.dataIso} ${b.horario}`.localeCompare(`${a.dataIso} ${a.horario}`)))
    } catch (error) {
      setErro(error.message || 'Não foi possível conectar aos serviços de turmas e chamadas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  async function criarChamada(event) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      const resposta = await fetchWithAuth(CHAMADAS_API, {
        method: 'POST',
        body: JSON.stringify({ turmaId: Number(turmaId), data, horario }),
      })
      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, 'Não foi possível criar a chamada.'))
      }

      setFormularioAberto(false)
      setMensagem('Chamada criada com sucesso!')
      setData(dataAtual())
      setHorario(horarioAtual())
      await carregarDados()
    } catch (error) {
      setErro(error.message || 'Erro ao criar chamada.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirChamada(aula) {
    if (!window.confirm(`Excluir a chamada de ${aula.data} às ${aula.horario}?`)) return
    setErro('')
    setMensagem('')
    const resposta = await fetchWithAuth(`${CHAMADAS_API}/${aula.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      setErro(await lerErro(resposta, 'Não foi possível excluir a chamada.'))
      return
    }
    setMensagem('Chamada excluída.')
    await carregarDados()
  }

  function voltar() {
    setAulaSelecionada(null)
    carregarDados()
  }

  if (aulaSelecionada) {
    if (!RegistroPresenca) {
      return (
        <div className="chamadas-container">
          <p>Componente de Registro de Presença não foi fornecido pelo Host.</p>
          <button type="button" onClick={voltar}>Voltar</button>
        </div>
      )
    }

    return (
      <Suspense fallback={<p className="chamadas-container">Carregando registro de presença...</p>}>
        <RegistroPresenca aula={aulaSelecionada} voltar={voltar} fetchWithAuth={fetchWithAuth} usuario={usuario} />
      </Suspense>
    )
  }

  return (
    <div className="chamadas-container">
      <div className="chamadas-header">
        <div>
          <h2>Chamadas</h2>
          <p>
            {usuario?.role === 'PROFESSOR'
              ? 'Chamadas das suas turmas.'
              : 'Gerencie a presença dos alunos nas aulas.'}
          </p>
        </div>

        <div className="chamadas-header-acoes">
          <span className="total-aulas">{aulas.length} chamadas</span>

          {podeGerenciar && (
            <button
              type="button"
              className="botao-criar-chamada"
              onClick={() => {
                setErro('')
                setMensagem('')
                setFormularioAberto(!formularioAberto)
              }}
              disabled={turmas.length === 0}
            >
              + Criar chamada
            </button>
          )}
        </div>
      </div>

      {mensagem && <p className="chamadas-sucesso" role="status">{mensagem}</p>}
      {erro && <p className="chamadas-erro" role="alert">{erro}</p>}

      {podeGerenciar && formularioAberto && (
        <div className="criar-chamada-card">
          <h3>Nova chamada</h3>

          <form onSubmit={criarChamada}>
            <div className="campo-chamada">
              <label htmlFor="turmaId">Turma</label>
              <select id="turmaId" value={turmaId} onChange={(event) => setTurmaId(event.target.value)} required>
                <option value="">Selecione uma turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome} — {turma.disciplinaNome}
                  </option>
                ))}
              </select>
            </div>

            <div className="campos-data-horario">
              <div className="campo-chamada">
                <label htmlFor="data">Data</label>
                <input id="data" type="date" value={data} onChange={(event) => setData(event.target.value)} required />
              </div>

              <div className="campo-chamada">
                <label htmlFor="horario">Horário</label>
                <input id="horario" type="time" value={horario} onChange={(event) => setHorario(event.target.value)} required />
              </div>
            </div>

            <div className="acoes-formulario-chamada">
              <button type="button" className="botao-cancelar-chamada" onClick={() => setFormularioAberto(false)} disabled={salvando}>
                Cancelar
              </button>
              <button type="submit" className="botao-criar-chamada" disabled={salvando || turmas.length === 0}>
                {salvando ? 'Criando...' : 'Criar chamada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {carregando && <p>Carregando turmas e chamadas...</p>}

      {!carregando && !erro && turmas.length === 0 && (
        <p>
          {usuario?.role === 'PROFESSOR'
            ? 'Você ainda não tem turmas atribuídas.'
            : 'Nenhuma turma cadastrada. Cadastre uma turma antes de criar chamadas.'}
        </p>
      )}

      {!carregando && !erro && turmas.length > 0 && aulas.length === 0 && (
        <p>Nenhuma chamada cadastrada. Clique em “Criar chamada” para registrar a primeira aula.</p>
      )}

      {!carregando && aulas.length > 0 && (
        <div className="chamadas-list">
          {aulas.map((aula) => {
            const finalizada = aula.statusOriginal === 'FINALIZADA'
            return (
              <div className="aula-card" key={aula.id}>
                <div className="aula-data">
                  <span className="dia">{aula.data.split('/')[0]}</span>
                  <span className="mes">{aula.data.split('/')[1]}</span>
                </div>

                <div className="aula-info">
                  <h3>{aula.disciplina}</h3>
                  <p>Turma: <strong>{aula.turmaNome || aula.turmaId}</strong></p>
                  <p>Professor: <strong>{aula.professor}</strong></p>
                  <span>{aula.data} — {aula.horario}</span>
                </div>

                <div className="aula-acoes">
                  <span className={`status ${finalizada ? 'registrada' : 'andamento'}`}>{aula.status}</span>

                  <button type="button" onClick={() => setAulaSelecionada(aula)}>
                    {finalizada ? 'Ver presenças' : 'Registrar presença'}
                  </button>

                  {podeGerenciar && !finalizada && (
                    <button type="button" className="botao-excluir-chamada" onClick={() => excluirChamada(aula)}>
                      Excluir
                    </button>
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

export default Chamadas
