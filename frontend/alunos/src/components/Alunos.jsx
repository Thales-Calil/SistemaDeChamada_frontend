import { useCallback, useEffect, useState } from 'react'
import './Alunos.css'

const API_URL = 'http://localhost:8081/api/alunos'
const TURMAS_API = 'http://localhost:8083/api/turmas'
const PRESENCAS_API = 'http://localhost:8082/api/presencas'

const FORMULARIO_INICIAL = {
  nome: '',
  matricula: '',
  email: '',
}

function Alunos() {
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
  const [frequencias, setFrequencias] = useState([])

  const buscarAlunos = useCallback(async () => {
    try {
      setErro('')

      const resposta = await fetch(API_URL)

      if (!resposta.ok) {
        throw new Error('Não foi possível carregar os alunos.')
      }

      const dados = await resposta.json()
      setAlunos(dados)
    } catch (error) {
      setErro(
        'Não foi possível conectar ao servidor. Verifique se o aluno-service está funcionando.'
      )
      console.error(error)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscarAlunos()
  }, [buscarAlunos])

  useEffect(() => {
  async function carregarTurmas() {
    const resposta = await fetch(TURMAS_API)
    const dados = await resposta.json()

    setTurmas(dados)

    if (dados.length > 0) {
      setTurmaSelecionada(String(dados[0].id))
    }
  }

  carregarTurmas().catch(console.error)
}, [])

  useEffect(() => {
    if (!turmaSelecionada) {
      setFrequencias([])
      return
    }

    async function carregarFrequencias() {
      const resposta = await fetch(
        `${PRESENCAS_API}/turma/${turmaSelecionada}`
      )

      if (!resposta.ok) {
        throw new Error('Erro ao carregar frequências')
      }

      setFrequencias(await resposta.json())
    }

    carregarFrequencias().catch(console.error)
  }, [turmaSelecionada])
  
  function abrirCadastro() {
    setAlunoEditando(null)
    setFormulario(FORMULARIO_INICIAL)
    setErro('')
    setMensagem('')
    setFormularioAberto(true)
  }

  function abrirEdicao(aluno) {
    setAlunoEditando(aluno)
    setFormulario({
      nome: aluno.nome,
      matricula: aluno.matricula,
      email: aluno.email,
    })
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

    setFormulario((atual) => ({
      ...atual,
      [name]: value,
    }))
  }

  async function salvarAluno(event) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)

    const editando = alunoEditando !== null
    const url = editando
      ? `${API_URL}/${alunoEditando.id}`
      : API_URL

    try {
      const resposta = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formulario),
      })

      if (!resposta.ok) {
        const detalhe = await resposta.text()
        let mensagemErro = ''

        try {
          const dadosErro = JSON.parse(detalhe)
          mensagemErro =
            dadosErro.message ||
            dadosErro.detail ||
            dadosErro.error ||
            ''
        } catch {
          mensagemErro = detalhe
        }

        throw new Error(
          mensagemErro ||
            `Não foi possível ${editando ? 'editar' : 'cadastrar'} o aluno. Verifique os dados e tente novamente.`
        )
      }

      fecharFormulario()
      setMensagem(
        editando
          ? 'Aluno atualizado com sucesso!'
          : 'Aluno cadastrado com sucesso!'
      )

      await buscarAlunos()
    } catch (error) {
      setErro(error.message || 'Ocorreu um erro ao salvar o aluno.')
      console.error(error)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirAluno(aluno) {
  const confirmou = window.confirm(
    `Tem certeza que deseja excluir o aluno ${aluno.nome}?`
  )

  if (!confirmou) return

  setErro('')
  setMensagem('')

  try {
    const resposta = await fetch(`${API_URL}/${aluno.id}`, {
      method: 'DELETE',
    })

    if (!resposta.ok) {
      throw new Error(
        'Não foi possível excluir o aluno. Verifique se ele possui vínculos no sistema.'
      )
    }

    setMensagem('Aluno excluído com sucesso!')
    await buscarAlunos()
  } catch (error) {
    setErro(error.message || 'Ocorreu um erro ao excluir o aluno.')
    console.error(error)
  }
}

  return (
    <div className="alunos-container">
      <div className="alunos-header">
        <div>
          <h2>Alunos</h2>
          <p>Visualize e gerencie os alunos cadastrados no sistema.</p>
        </div>

        <div className="alunos-header-acoes">
          <span className="total-alunos">
            {alunos.length} alunos
          </span>

          <button
            type="button"
            className="botao-principal"
            onClick={abrirCadastro}
          >
            + Cadastrar aluno
          </button>
        </div>
      </div>

      {mensagem && (
        <p className="mensagem-sucesso" role="status">
          {mensagem}
        </p>
      )}

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {formularioAberto && (
        <div className="formulario-card">
          <div className="formulario-header">
            <h3>
              {alunoEditando ? 'Editar aluno' : 'Cadastrar aluno'}
            </h3>

            <button
              type="button"
              className="botao-fechar"
              onClick={fecharFormulario}
              aria-label="Fechar formulário"
            >
              ×
            </button>
          </div>

          <form onSubmit={salvarAluno}>
            <div className="campo-formulario">
              <label htmlFor="nome">Nome completo</label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formulario.nome}
                onChange={atualizarCampo}
                placeholder="Digite o nome do aluno"
                required
              />
            </div>

            <div className="campo-formulario">
              <label htmlFor="matricula">Matrícula</label>
              <input
                id="matricula"
                name="matricula"
                type="text"
                value={formulario.matricula}
                onChange={atualizarCampo}
                placeholder="Digite a matrícula"
                required
              />
            </div>

            <div className="campo-formulario">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formulario.email}
                onChange={atualizarCampo}
                placeholder="aluno@email.com"
                required
              />
            </div>

            <div className="formulario-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={fecharFormulario}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="botao-principal"
                disabled={salvando}
              >
                {salvando
                  ? 'Salvando...'
                  : alunoEditando
                    ? 'Salvar alterações'
                    : 'Cadastrar aluno'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filtro-frequencia">
        <label htmlFor="turmaFrequencia">Turma:</label>

        <select
          id="turmaFrequencia"
          value={turmaSelecionada}
          onChange={(event) => setTurmaSelecionada(event.target.value)}
        >
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome} — {turma.disciplinaNome}
            </option>
          ))}
        </select>
      </div>

      {carregando && <p>Carregando alunos...</p>}

      {!carregando && !erro && alunos.length === 0 && (
        <p>Nenhum aluno cadastrado.</p>
      )}

      {!carregando && alunos.length > 0 && (
        <div className="alunos-grid">
          {alunos.map((aluno) => (
            <div className="aluno-card" key={aluno.id}>
              <div className="aluno-avatar">
                {aluno.nome.charAt(0).toUpperCase()}
              </div>

              <div className="aluno-info">
                <h3>{aluno.nome}</h3>
                <span>Matrícula: {aluno.matricula}</span>
                <span className="aluno-email">{aluno.email}</span>
              </div>

              <div className="presenca">
                <span>Frequência</span>
                {(() => {
                  const frequencia = frequencias.find(
                    (item) => item.alunoId === aluno.id
                  )

                  if (!frequencia) {
                    return <strong>Sem dados</strong>
                  }

                  return (
                    <strong
                      className={
                        frequencia.percentual >= 70
                          ? 'frequencia-aprovada'
                          : 'frequencia-baixa'
                      }
                    >
                      {frequencia.percentual.toFixed(1)}%
                    </strong>
                  )
                })()}

                <button
                  type="button"
                  className="botao-editar"
                  onClick={() => abrirEdicao(aluno)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="botao-excluir"
                  onClick={() => excluirAluno(aluno)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Alunos