import RegistroPresenca from './components/RegistroPresenca'

// Execução isolada do MFE (desenvolvimento). Em produção ele é carregado pelo Host.
function App() {
  return <RegistroPresenca voltar={() => window.history.back()} />
}

export default App
