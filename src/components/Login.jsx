import { useState } from 'react'
import { login } from '../utils/storage'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!username || !password) { setError('Введите логин и пароль'); return }
    setLoading(true)
    setError('')
    const user = await login(username.trim(), password.trim())
    setLoading(false)
    if (!user) { setError('Неверный логин или пароль'); return }
    onLogin(user)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">📊 <span>Sales</span> Report</div>
        <h2 className="login-title">Войти в систему</h2>

        <div className="login-field">
          <label>Логин</label>
          <input
            className="login-inp"
            placeholder="admin / seller"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            autoComplete="username"
          />
        </div>
        <div className="login-field">
          <label>Пароль</label>
          <input
            className="login-inp"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" onClick={handle} disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div className="login-hint">
          <b>admin</b> — полный доступ &nbsp;|&nbsp; <b>seller</b> — только продажи
        </div>
      </div>
    </div>
  )
}
