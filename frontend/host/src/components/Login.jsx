import { useState } from 'react';
import { login } from '../services/authService.js';
import './Login.css';

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
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Login - Sistema de Chamadas</h2>
        
        {erro && <div className="login-error">{erro}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuário:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ex: admin ou professor"
              required 
            />
          </div>

          <div className="form-group">
            <label>Senha:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="login-button" disabled={carregando}>
            {carregando ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;