import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import Toast from './Toast'

export default function Login({ onSwitch }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

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
      setError('Credenciales incorrectas')
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

      <form onSubmit={handleLogin}>

        {error && (
          <p style={{ color: 'red' }}>
            {error}
          </p>
        )}

        <label>Correo electrónico:</label>

        <input
          type="email"
          name="email"
          placeholder="usuario@correo.com"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>Contraseña:</label>

        <input
          type="password"
          name="password"
          placeholder="Tu contraseña"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={cargando}>
          {cargando ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>

        <button type="button" onClick={onSwitch}>
          Crear cuenta nueva
        </button>

      </form>
    </>
  )
}