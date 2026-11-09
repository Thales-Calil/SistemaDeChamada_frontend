import { useEffect, useState } from 'react'
import { fetchWithAuth as defaultFetchWithAuth } from '../api/fetchWithAuth'
import './RegistroPresenca.css'

// Endpoints unificados no API Gateway (Porta 8080)
const ALUNOS_API = '/api/alunos'
const CHAMADAS_API = '/api/chamadas'

function RegistroPresenca({ aula, voltar, fetchWithAuth }) {
  // Utiliza a função enviada pelo MFE pai ou a importada localmente
  const httpFetch = fetchWithAuth || defaultFetchWithAuth

  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  const finalizada =
    aula?.status === 'FINALIZADA' ||
    aula?.status === 'Presença registrada'

  useEffect(() => {
    async function carregarAlunos() {
      try {
        setCarregando(true)
        setErro('')

        const resposta = await httpFetch(ALUNOS_API)

        if (!resposta.ok) {
          if (resposta.status === 403) {
            throw new Error('Acesso negado: Sem permissão para listar alunos.')
          }
          throw new Error('Não foi possível carregar os alunos.')
        }

        const dados = await resposta.json()

        setAlunos(
          dados.map((aluno) => ({
            ...aluno,
            presente: false,
          }))
        )
      } catch (error) {
        setErro(
          `${error.message} Verifique se o API Gateway e os serviços estão ativos.`
        )
      } finally {
        setCarregando(false)
      }
    }

    carregarAlunos()
  }, [httpFetch])

  const alterarPresenca = (id) => {
    if (finalizada || salvando) return

    setAlunos((atuais) =>
      atuais.map((aluno) =>
        aluno.id === id
          ? { ...aluno, presente: !aluno.presente }
          : aluno
      )
    )

    setSalvo(false)
    setErro('')
  }

  const salvarChamada = async () => {
    if (!aula?.id) {
      setErro('Não foi possível identificar a chamada selecionada.')
      return
    }

    try {
      setSalvando(true)
      setErro('')

      // 1. Envia a presença/ausência de cada aluno via Gateway (Porta 8080)
      for (const aluno of alunos) {
        const resposta = await httpFetch(
          `${CHAMADAS_API}/${aula.id}/presencas`,
          {
            method: 'POST',
            body: JSON.stringify({
              alunoId: aluno.id,
              presente: aluno.presente,
            }),
          }
        )

        if (!resposta.ok) {
          if (resposta.status === 403) {
            throw new Error('Acesso Negado: Apenas PROFESSOR ou ADMIN podem registrar presenças.')
          }
          throw new Error(
            `Não foi possível salvar a presença de ${aluno.nome}.`
          )
        }
      }

      // 2. Finaliza a chamada e dispara o evento no Azure Service Bus
      const respostaFinalizacao = await httpFetch(
        `${CHAMADAS_API}/${aula.id}/finalizar`,
        {
          method: 'PUT',
        }
      )

      if (!respostaFinalizacao.ok) {
        if (respostaFinalizacao.status === 403) {
          throw new Error('Acesso Negado: Sem permissão para finalizar chamadas.')
        }
        throw new Error(
          'As presenças foram enviadas, mas não foi possível finalizar a chamada.'
        )
      }

      setSalvo(true)
      voltar()
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
          <button className="voltar-button" onClick={voltar}>
            ← Voltar para chamadas
          </button>

          <h2>Registro de Presença</h2>

          <p>
            {aula?.disciplina || 'Disciplina'} •{' '}
            {aula?.professor || 'Professor'}
          </p>
        </div>
      </div>

      <div className="aula-resumo">
        <div>
          <span>Disciplina</span>
          <strong>{aula?.disciplina || '—'}</strong>
        </div>

        <div>
          <span>Professor</span>
          <strong>{aula?.professor || '—'}</strong>
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

      {carregando ? (
        <p>Carregando alunos...</p>
      ) : alunos.length === 0 ? (
        <p>Nenhum aluno cadastrado.</p>
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
                <div className="aluno-avatar">
                  {aluno.nome?.charAt(0) || '?'}
                </div>

                <strong>{aluno.nome}</strong>
              </div>

              <span className="matricula">
                {aluno.matricula || '—'}
              </span>

              <button
                className={`presenca-button ${
                  aluno.presente ? 'presente' : 'ausente'
                }`}
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
        {salvo && (
          <span className="mensagem-sucesso">
            ✓ Chamada salva com sucesso!
          </span>
        )}

        <div className="footer-acoes">
          <button className="cancelar-button" onClick={voltar}>
            Voltar
          </button>

          {!finalizada && (
            <button
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