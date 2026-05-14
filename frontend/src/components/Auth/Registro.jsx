import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'

export default function Registro({ onSwitch }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '', email: '', peso: '', altura: '',
    fecha_nacimiento: '', password: '', confirmPassword: '',
    genero: '', meta: ''
  })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)
    try {
      const res = await api.post('/registro/', {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        peso: form.peso,
        altura: form.altura,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero,
        meta: form.meta
      })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.email?.[0] || 'Error al registrarse')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleRegistro}>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <label>Nombre completo:</label>
      <input type="text" name="nombre" placeholder="Juan Pérez"
        value={form.nombre} onChange={handleChange} required />

      <label>Correo electrónico:</label>
      <input type="email" name="email" placeholder="usuario@correo.com"
        value={form.email} onChange={handleChange} required />

      <label>Peso (kg):</label>
      <input type="number" name="peso" step="0.1" placeholder="70"
        value={form.peso} onChange={handleChange} />

      <label>Altura (m):</label>
      <input type="number" name="altura" step="0.01" placeholder="1.75"
        value={form.altura} onChange={handleChange} />

      <label>Fecha de nacimiento:</label>
      <input type="date" name="fecha_nacimiento"
        value={form.fecha_nacimiento} onChange={handleChange} />

      <label>Género:</label>
      <select name="genero" value={form.genero} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="masculino">Masculino</option>
        <option value="femenino">Femenino</option>
        <option value="otro">Otro</option>
      </select>

      <label>Meta:</label>
      <select name="meta" value={form.meta} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="perder_peso">Perder peso</option>
        <option value="ganar_musculo">Ganar músculo</option>
        <option value="mantenerse">Mantenerse</option>
        <option value="mejorar_resistencia">Mejorar resistencia</option>
      </select>

      <label>Contraseña:</label>
      <input type="password" name="password" placeholder="Mínimo 8 caracteres"
        value={form.password} onChange={handleChange} required />

      <label>Confirmar contraseña:</label>
      <input type="password" name="confirmPassword" placeholder="Repite tu contraseña"
        value={form.confirmPassword} onChange={handleChange} required />

      <button type="submit" disabled={cargando}>
        {cargando ? 'Registrando...' : 'Registrar'}
      </button>
      <button type="button" onClick={onSwitch}>Ya tengo cuenta</button>
    </form>
  )
}