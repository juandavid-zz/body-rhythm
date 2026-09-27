import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'

export default function Login({ onSwitch }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [mensajeReenvio, setMensajeReenvio] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeReenvio('')
    setCargando(true)

    try {
      const res = await api.post('/login/', {
        email: form.email,
        password: form.password
      })

      localStorage.setItem('token', res.data.token)
      navigate('/')
    } catch (err) {
      const data = err.response?.data || {}
      setPendiente(Boolean(data.requiere_verificacion))
      setError(data.error || 'Credenciales incorrectas.')
    } finally {
      setCargando(false)
    }
  }

  const reenviarVerificacion = async () => {
    setReenviando(true)
    setMensajeReenvio('')
    try {
      const res = await api.post('/reenviar-verificacion/', { email: form.email })
      setError('')
      setMensajeReenvio(res.data.mensaje || 'Te enviamos un nuevo enlace de confirmación.')
      setPendiente(false)
    } catch (err) {
      setMensajeReenvio('')
      setError(err.response?.data?.error || 'No pudimos reenviar el correo. Inténtalo nuevamente.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="auth-error">{error}</div>}
      {mensajeReenvio && <div className="auth-success">{mensajeReenvio}</div>}

      {pendiente && (
        <button
          className="auth-secondary"
          type="button"
          onClick={reenviarVerificacion}
          disabled={reenviando}
        >
          {reenviando ? 'Enviando enlace...' : 'Reenviar correo de confirmación'}
        </button>
      )}

      <label htmlFor="login-email">Correo electrónico</label>
      <input id="login-email" type="email" name="email" placeholder="usuario@correo.com"
        value={form.email} onChange={handleChange} required />

      <label htmlFor="login-password">Contraseña</label>
      <input id="login-password" type="password" name="password" placeholder="Tu contraseña"
        value={form.password} onChange={handleChange} required />

      <button className="auth-submit" type="submit" disabled={cargando}>
        {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
      <button className="auth-switch" type="button" onClick={onSwitch}>
        Crear una cuenta nueva
      </button>
    </form>
  )
}
