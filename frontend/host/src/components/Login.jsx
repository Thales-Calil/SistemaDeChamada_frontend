import { useState } from 'react';
import { login } from '../services/authService.js';
import './Login.css';

function Login({ onLoginSucesso, aviso }) {
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
        
        {aviso && !erro && <div className="login-aviso">{aviso}</div>}
        {erro && <div className="login-error">{erro}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuário:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Seu usuário"
              autoComplete="username"
              required 
            />
          </div>

          <div className="form-group">
            <label>Senha:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              autoComplete="current-password"
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