import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import './Chamadas.css'

const RegistroPresenca = lazy(
  () => import('registroPresenca/RegistroPresenca')
)

const TURMAS_API = 'http://localhost:8083/api/turmas'
const CHAMADAS_API = 'http://localhost:8082/api/chamadas'

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

function Chamadas() {
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
      const respostaTurmas = await fetch(TURMAS_API)

      if (!respostaTurmas.ok) {
        throw new Error('Não foi possível carregar as turmas.')
      }

      const dadosTurmas = await respostaTurmas.json()
      setTurmas(dadosTurmas)

      const chamadasPorTurma = await Promise.all(
        dadosTurmas.map(async (turma) => {
          const resposta = await fetch(
            `${CHAMADAS_API}/turma/${turma.id}`
          )

          if (!resposta.ok) {
            throw new Error(
              `Não foi possível carregar as chamadas da turma ${turma.nome}.`
            )
          }

          const chamadasTurma = await resposta.json()

          return chamadasTurma.map((chamada) => ({
            ...chamada,
            turmaId: turma.id,
            disciplina: turma.disciplinaNome,
            professor: turma.professorNome,
            data: formatarData(chamada.data),
            horario: chamada.horario?.slice(0, 5) || '',
            status: traduzirStatus(chamada.status),
          }))
        })
      )

      setAulas(chamadasPorTurma.flat())
    } catch (error) {
      setErro(
        error.message ||
          'Não foi possível conectar aos serviços de turmas e chamadas.'
      )
      console.error(error)
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
      const resposta = await fetch(CHAMADAS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turmaId: Number(turmaId),
          data,
          horario,
        }),
      })

      if (!resposta.ok) {
        const detalhe = await resposta.text()
        throw new Error(
          detalhe || 'Não foi possível criar a chamada.'
        )
      }

      setFormularioAberto(false)
      setMensagem('Chamada criada com sucesso!')
      setData(dataAtual())
      setHorario(horarioAtual())

      await carregarDados()
    } catch (error) {
      setErro(error.message || 'Erro ao criar chamada.')
      console.error(error)
    } finally {
      setSalvando(false)
    }
  }

  function abrirRegistro(aula) {
    setAulaSelecionada(aula)
  }

  function voltar() {
    setAulaSelecionada(null)
    carregarDados()
  }

  if (aulaSelecionada) {
    return (
      <Suspense fallback={<p>Carregando registro de presença...</p>}>
        <RegistroPresenca
          aula={aulaSelecionada}
          voltar={voltar}
        />
      </Suspense>
    )
  }

  return (
    <div className="chamadas-container">
      <div className="chamadas-header">
        <div>
          <h2>Chamadas</h2>
          <p>Gerencie a presença dos alunos nas aulas.</p>
        </div>

        <div className="chamadas-header-acoes">
          <span className="total-aulas">
            {aulas.length} chamadas
          </span>

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
        </div>
      </div>

      {mensagem && (
        <p className="chamadas-sucesso" role="status">
          {mensagem}
        </p>
      )}

      {erro && (
        <p className="chamadas-erro" role="alert">
          {erro}
        </p>
      )}

      {formularioAberto && (
        <div className="criar-chamada-card">
          <h3>Nova chamada</h3>

          <form onSubmit={criarChamada}>
            <div className="campo-chamada">
              <label htmlFor="turmaId">Turma</label>

              <select
                id="turmaId"
                value={turmaId}
                onChange={(event) => setTurmaId(event.target.value)}
                required
              >
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
                <input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(event) => setData(event.target.value)}
                  required
                />
              </div>

              <div className="campo-chamada">
                <label htmlFor="horario">Horário</label>
                <input
                  id="horario"
                  type="time"
                  value={horario}
                  onChange={(event) => setHorario(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="acoes-formulario-chamada">
              <button
                type="button"
                className="botao-cancelar-chamada"
                onClick={() => setFormularioAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="botao-criar-chamada"
                disabled={salvando || turmas.length === 0}
              >
                {salvando ? 'Criando...' : 'Criar chamada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {carregando && <p>Carregando turmas e chamadas...</p>}

      {!carregando && !erro && turmas.length === 0 && (
        <p>
          Nenhuma turma cadastrada. Cadastre uma turma antes de criar
          chamadas.
        </p>
      )}

      {!carregando && !erro && turmas.length > 0 && aulas.length === 0 && (
        <p>
          Nenhuma chamada cadastrada. Clique em “Criar chamada” para
          registrar a primeira aula.
        </p>
      )}

      {!carregando && aulas.length > 0 && (
        <div className="chamadas-list">
          {aulas.map((aula) => (
            <div className="aula-card" key={aula.id}>
              <div className="aula-data">
                <span className="dia">
                  {aula.data.split('/')[0]}
                </span>

                <span className="mes">
                  {aula.data.split('/')[1]}
                </span>
              </div>

              <div className="aula-info">
                <h3>{aula.disciplina}</h3>

                <p>
                  Turma: <strong>{turmas.find(
                    (turma) => turma.id === aula.turmaId
                  )?.nome || aula.turmaId}</strong>
                </p>

                <p>
                  Professor: <strong>{aula.professor}</strong>
                </p>

                <span>
                  {aula.data} • {aula.horario}
                </span>
              </div>

              <div className="aula-acoes">
                <span
                  className={`status ${
                    aula.status === 'Presença registrada'
                      ? 'registrada'
                      : aula.status === 'Em andamento'
                        ? 'andamento'
                        : 'agendada'
                  }`}
                >
                  {aula.status}
                </span>

                <button
                  onClick={() => abrirRegistro(aula)}
                  disabled={aula.status === 'Presença registrada'}
                >
                  {aula.status === 'Presença registrada'
                    ? 'Chamada finalizada'
                    : 'Registrar presença'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Chamadas