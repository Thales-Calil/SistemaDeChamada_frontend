import { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/Login';
import { getUsuarioLogado, logout } from './services/authService.js';

// Componentes remotos carregados via Module Federation
const Alunos = lazy(() => import('alunos/Alunos'));
const Chamadas = lazy(() => import('chamadas/Chamadas'));

function App() {
  const [usuario, setUsuario] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('chamadas');

  useEffect(() => {
    const user = getUsuarioLogado();
    if (user.token) {
      setUsuario(user);
    }
  }, []);

  // Se não houver JWT no localStorage, bloqueia a exibição dos MFEs e força o Login
  if (!usuario?.token) {
    return <Login onLoginSucesso={() => setUsuario(getUsuarioLogado())} />;
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <h1>Sistema de Gestão Escolar</h1>

        <nav>
          <button onClick={() => setAbaAtiva('chamadas')}>Chamadas</button>
          <button onClick={() => setAbaAtiva('alunos')}>Alunos</button>
        </nav>

        <div className="user-info">
          <span>Usuário: <strong>{usuario.username}</strong> ({usuario.role})</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="conteudo-principal">
        <Suspense fallback={<div>Carregando Microfrontend...</div>}>
          {abaAtiva === 'chamadas' && <Chamadas />}
          {abaAtiva === 'alunos' && <Alunos />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
