import { useState } from 'react';
import { login } from '../services/authService';

function Login({ onLoginSucesso }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(username, password);
      onLoginSucesso();
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
    
  };
  

  return (
    <div className="login-container">
      <h2>Login - Sistema de Chamadas</h2>
      
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Usuário:</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Ex: admin ou professor"
            required 
          />
        </div>

        <div>
          <label>Senha:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button type="submit" disabled={carregando}>
          {carregando ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default Login;
