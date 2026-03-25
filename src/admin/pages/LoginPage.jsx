import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('adm_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <div className="adm-login-logo">
          <div className="logo-circle">🍕</div>
          <h2>Pizzaria Admin</h2>
          <p>Painel de gerenciamento</p>
        </div>

        {error && <div className="adm-login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Usuário</label>
          <input
            type="text"
            placeholder="Digite seu usuário"
            value={user}
            onChange={e => setUser(e.target.value)}
            autoFocus
            required
          />
          <label>Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={pass}
            onChange={e => setPass(e.target.value)}
            required
          />
          <button type="submit" className="adm-btn-login" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
