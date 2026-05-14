import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'

export default function Login({ onSwitch }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await api.post('/login/', {
        email: form.email,
        password: form.password
      })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError('Credenciales incorrectas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <label>Correo electrónico:</label>
      <input type="email" name="email" placeholder="usuario@correo.com"
        value={form.email} onChange={handleChange} required />

      <label>Contraseña:</label>
      <input type="password" name="password" placeholder="Tu contraseña"
        value={form.password} onChange={handleChange} required />

      <button type="submit" disabled={cargando}>
        {cargando ? 'Iniciando...' : 'Iniciar Sesión'}
      </button>
      <button type="button" onClick={onSwitch}>Crear cuenta nueva</button>
    </form>
  )
}