import { Component } from 'react'

/**
 * 3.3: se um microfrontend não carregar (remoteEntry.js fora do ar, deploy pela metade,
 * erro dentro do componente), mostra um aviso só naquela área em vez de derrubar o app inteiro.
 */
class RemoteBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error(`[Host] Falha no microfrontend "${this.props.nome}":`, erro, info?.componentStack)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="remote-erro" role="alert">
          <h3>Não foi possível carregar o módulo “{this.props.nome}”.</h3>
          <p>
            Pode ser uma instabilidade de rede ou uma atualização em andamento. As outras abas
            continuam funcionando.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default RemoteBoundary
