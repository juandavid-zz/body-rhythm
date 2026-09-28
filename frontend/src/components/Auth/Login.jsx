import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import Toast from './Toast'

const IconoOjoAbierto = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="6.5" />
    <circle cx="12" cy="12" r="2.8" fill="currentColor" stroke="none" opacity="0.9" />
  </svg>
)

const IconoOjoCerrado = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.9 17.9C16.2 18.9 14.2 19.5 12 19.5 6.5 19.5 2 12 2 12s1.8-3 4.7-5.3" />
    <path d="M9.9 5C10.6 4.8 11.3 4.7 12 4.7c5.5 0 10 7.3 10 7.3s-.7 1.2-2 2.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
)

export default function Login({ onSwitch }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState(null)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
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
      localStorage.setItem('refresh', res.data.refresh)

      localStorage.removeItem('nombre')

      if (res.data.nombre) {
        localStorage.setItem('nombre', res.data.nombre)
      }

      const nombre = res.data.nombre

      const saludo = nombre
        ? `¡Bienvenido de vuelta, ${nombre.split(' ')[0]}! 👋`
        : '¡Inicio de sesión exitoso! 👋'

      setToast(saludo)

      setTimeout(() => navigate('/'), 2000)

    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {toast && (
        <Toast
          mensaje={toast}
          tipo="exito"
          duracion={2000}
        />
      )}

      <p className="auth-subtitulo">Inicia sesión para seguir con tu plan</p>

      <form onSubmit={handleLogin}>

        {error && <p className="error">{error}</p>}

        <div className="form-group">
          <label>Correo electrónico</label>
          <input
            type="email"
            name="email"
            placeholder="usuario@correo.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <div className="input-con-icono">
            <input
              type={verPassword ? 'text' : 'password'}
              name="password"
              placeholder="Tu contraseña"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="btn-ojo"
              onClick={() => setVerPassword(!verPassword)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verPassword ? <IconoOjoAbierto /> : <IconoOjoCerrado />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={cargando}>
          {cargando ? 'Iniciando...' : 'Iniciar sesión'}
        </button>

        <button type="button" className="btn-switch" onClick={onSwitch}>
          ¿No tienes cuenta? <strong>Crear cuenta nueva</strong>
        </button>

      </form>
    </>
  )
}