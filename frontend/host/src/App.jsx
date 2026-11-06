import { lazy, Suspense, useState } from 'react'
import './App.css'

const Alunos = lazy(() => import('alunos/Alunos'))
const Chamadas = lazy(() => import('chamadas/Chamadas'))

function Loading() {
  return <p>Carregando módulo...</p>
}

function App() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Sistema de Chamadas</h1>
          <p>Gerenciamento de alunos e presença</p>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 0 ? 'active' : ''}
          onClick={() => setActiveTab(0)}
        >
          Alunos
        </button>

        <button
          className={activeTab === 1 ? 'active' : ''}
          onClick={() => setActiveTab(1)}
        >
          Chamadas
        </button>
      </nav>

      <main className="content">
        <Suspense fallback={<Loading />}>
          {activeTab === 0 && <Alunos />}
          {activeTab === 1 && <Chamadas />}
        </Suspense>
      </main>
    </div>
  )
}

export default App