import { useEffect, useState } from 'react'
import { fetchWithAuth as defaultFetchWithAuth, lerErro } from '../api/fetchWithAuth'
import './RegistroPresenca.css'

// Endpoints unificados no API Gateway
const ALUNOS_API = '/api/alunos'
const TURMAS_API = '/api/turmas'
const CHAMADAS_API = '/api/chamadas'

async function buscarJson(httpFetch, endpoint, padraoErro) {
  const resposta = await httpFetch(endpoint)
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta, padraoErro))
  }
  return resposta.json()
}

/**
 * Registro de presença de UMA chamada.
 * - Lista apenas os alunos MATRICULADOS na turma da chamada.
 * - 3.1: salva todos os alunos e finaliza numa única requisição (tudo ou nada no backend).
 *   Se cair a conexão no meio, nada fica pela metade e é seguro tentar de novo.
 * - Chamada finalizada abre em modo somente leitura.
 */
function RegistroPresenca({ aula, voltar, fetchWithAuth }) {
  // Utiliza a função enviada pelo MFE pai ou a importada localmente
  const httpFetch = fetchWithAuth || defaultFetchWithAuth

  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  const finalizada =
    salvo || aula?.statusOriginal === 'FINALIZADA' || aula?.status === 'FINALIZADA' || aula?.status === 'Presença registrada'

  useEffect(() => {
    async function carregarAlunos() {
      if (!aula?.id || !aula?.turmaId) {
        setErro('Não foi possível identificar a chamada selecionada.')
        setCarregando(false)
        return
      }
      try {
        setCarregando(true)
        setErro('')

        // 1. Ids dos alunos matriculados + presenças já registradas nesta chamada
        const [idsMatriculados, presencas] = await Promise.all([
          buscarJson(httpFetch, `${TURMAS_API}/${aula.turmaId}/alunos`, 'Não foi possível carregar os alunos da turma.'),
          buscarJson(httpFetch, `${CHAMADAS_API}/${aula.id}/presencas`, 'Não foi possível carregar as presenças.'),
        ])

        // inclui quem já tem presença registrada mesmo que tenha saído da turma depois
        const ids = [...new Set([...idsMatriculados, ...presencas.map((p) => p.alunoId)])]
        if (ids.length === 0) {
          setAlunos([])
          return
        }

        // 2. Dados dos alunos (nome, matrícula)
        const dados = await buscarJson(httpFetch, `${ALUNOS_API}?ids=${ids.join(',')}`, 'Não foi possível carregar os alunos.')
        const presencaPorAluno = new Map(presencas.map((p) => [p.alunoId, p.presente]))

        setAlunos(
          dados.map((aluno) => ({
            ...aluno,
            presente: presencaPorAluno.get(aluno.id) ?? false,
          }))
        )
      } catch (error) {
        setErro(error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarAlunos()
  }, [httpFetch, aula?.id, aula?.turmaId])

  const alterarPresenca = (id) => {
    if (finalizada || salvando) return
    setAlunos((atuais) => atuais.map((aluno) => (aluno.id === id ? { ...aluno, presente: !aluno.presente } : aluno)))
    setErro('')
  }

  const marcarTodos = (presente) => {
    if (finalizada || salvando) return
    setAlunos((atuais) => atuais.map((aluno) => ({ ...aluno, presente })))
  }

  const salvarChamada = async () => {
    if (!aula?.id) {
      setErro('Não foi possível identificar a chamada selecionada.')
      return
    }

    try {
      setSalvando(true)
      setErro('')

      // 3.1: uma requisição só: grava todos e finaliza (transação única no chamada-service)
      const resposta = await httpFetch(`${CHAMADAS_API}/${aula.id}/presencas/lote`, {
        method: 'POST',
        body: JSON.stringify({
          presencas: alunos.map((aluno) => ({ alunoId: aluno.id, presente: aluno.presente })),
          finalizar: true,
        }),
      })

      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, 'Não foi possível salvar a chamada. Nada foi gravado; tente novamente.'))
      }

      setSalvo(true)
    } catch (error) {
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  const presentes = alunos.filter((aluno) => aluno.presente).length
  const ausentes = alunos.length - presentes

  return (
    <div className="registro-container">
      <div className="registro-header">
        <div>
          <button type="button" className="voltar-button" onClick={voltar}>
            ← Voltar para chamadas
          </button>

          <h2>{finalizada ? 'Presenças da chamada' : 'Registro de Presença'}</h2>

          <p>
            {aula?.disciplina || 'Disciplina'} • {aula?.professor || 'Professor'}
          </p>
        </div>
      </div>

      <div className="aula-resumo">
        <div>
          <span>Disciplina</span>
          <strong>{aula?.disciplina || '—'}</strong>
        </div>
        <div>
          <span>Turma</span>
          <strong>{aula?.turmaNome || '—'}</strong>
        </div>
        <div>
          <span>Data</span>
          <strong>{aula?.data || '—'}</strong>
        </div>
        <div>
          <span>Horário</span>
          <strong>{aula?.horario || '—'}</strong>
        </div>
      </div>

      <div className="presenca-resumo">
        <div className="resumo-card">
          <span>Total de alunos</span>
          <strong>{alunos.length}</strong>
        </div>
        <div className="resumo-card presente">
          <span>Presentes</span>
          <strong>{presentes}</strong>
        </div>
        <div className="resumo-card ausente">
          <span>Ausentes</span>
          <strong>{ausentes}</strong>
        </div>
      </div>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {!finalizada && alunos.length > 0 && (
        <div className="marcar-todos">
          <button type="button" onClick={() => marcarTodos(true)} disabled={salvando}>Marcar todos presentes</button>
          <button type="button" onClick={() => marcarTodos(false)} disabled={salvando}>Marcar todos ausentes</button>
        </div>
      )}

      {carregando ? (
        <p>Carregando alunos...</p>
      ) : alunos.length === 0 ? (
        <p>Nenhum aluno matriculado nesta turma. Peça ao administrador para matricular os alunos.</p>
      ) : (
        <div className="lista-presenca">
          <div className="lista-header">
            <span>Aluno</span>
            <span>Matrícula</span>
            <span>Status</span>
          </div>

          {alunos.map((aluno) => (
            <div className="aluno-presenca" key={aluno.id}>
              <div className="aluno-dados">
                <div className="aluno-avatar">{aluno.nome?.charAt(0) || '?'}</div>
                <strong>{aluno.nome}</strong>
              </div>

              <span className="matricula">{aluno.matricula || '—'}</span>

              <button
                type="button"
                className={`presenca-button ${aluno.presente ? 'presente' : 'ausente'}`}
                onClick={() => alterarPresenca(aluno.id)}
                disabled={finalizada || salvando}
              >
                {aluno.presente ? '✓ Presente' : '○ Ausente'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="registro-footer">
        {salvo && <span className="mensagem-sucesso">✓ Chamada salva e finalizada com sucesso!</span>}

        <div className="footer-acoes">
          <button type="button" className="cancelar-button" onClick={voltar}>
            Voltar
          </button>

          {!finalizada && (
            <button
              type="button"
              className="salvar-button"
              onClick={salvarChamada}
              disabled={carregando || salvando || alunos.length === 0}
            >
              {salvando ? 'Salvando...' : 'Salvar e finalizar chamada'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RegistroPresenca
