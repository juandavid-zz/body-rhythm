import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import Toast from './Toast'
import PasswordChecklist from './PasswordChecklist'
import { cumpleMinimoBackend } from './passwordUtils'
import CustomSelect from './CustomSelect'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// SVG limpio — sin fondo, sin artefactos
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

const OPCIONES_GENERO = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
]

const OPCIONES_META = [
  { value: 'perder_peso', label: 'Perder peso' },
  { value: 'ganar_musculo', label: 'Ganar músculo' },
  { value: 'mantenerse', label: 'Mantenerse' },
  { value: 'mejorar_resistencia', label: 'Mejorar resistencia' },
]

export default function Registro({ onSwitch }) {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)

  const [form, setForm] = useState({
    nombre: '', email: '', peso: '', altura: '',
    fecha_nacimiento: '', password: '', confirmPassword: '',
    genero: '', meta: ''
  })

  const [verPassword, setVerPassword] = useState(false)
  const [verConfirm, setVerConfirm] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const emailValido = EMAIL_REGEX.test(form.email)
  const passwordValida = cumpleMinimoBackend(form.password)
  const confirmValida = form.confirmPassword.length > 0 && form.confirmPassword === form.password
  const paso1Completo = emailValido && passwordValida && confirmValida

  const handleContinuar = (e) => {
    e.preventDefault()
    setError('')
    if (!emailValido) { setError('Ingresa un correo válido'); return }
    if (!passwordValida) { setError('La contraseña debe tener mínimo 8 caracteres'); return }
    if (!confirmValida) { setError('Las contraseñas no coinciden'); return }
    setPaso(2)
  }

  const handleAtras = () => { setError(''); setPaso(1) }

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const res = await api.post('/registro/', {
        nombre: form.nombre, email: form.email, password: form.password,
        peso: form.peso, altura: form.altura,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero, meta: form.meta
      })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refresh', res.data.refresh)
      const primerNombre = form.nombre.trim().split(' ')[0]
      localStorage.setItem('nombre', form.nombre.trim())
      setToast(`¡Registro exitoso! Bienvenido, ${primerNombre} 🎉`)
      setTimeout(() => navigate('/'), 2200)
    } catch (err) {
      const data = err.response?.data
      const mensaje = data?.email?.[0] || data?.error || data?.password?.[0] || 'Error al registrarse'
      setError(mensaje)
      if (data?.email || data?.error?.includes('correo')) setPaso(1)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {toast && <Toast mensaje={toast} tipo="exito" duracion={2200} />}

      <div className="paso-indicador">
        <div className={`paso-segmento ${paso >= 1 ? 'completo' : ''}`} />
        <div className={`paso-segmento ${paso >= 2 ? 'activo' : ''}`} />
      </div>
      <p className="paso-etiqueta">
        {paso === 1 ? 'Paso 1 de 2 · Acceso' : 'Paso 2 de 2 · Datos personales'}
      </p>

      {paso === 1 && (
        <form onSubmit={handleContinuar}>
          {error && <p className="error">{error}</p>}

          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" name="email" placeholder="usuario@correo.com"
              value={form.email} onChange={handleChange} autoComplete="email" required />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-con-icono">
              <input
                type={verPassword ? 'text' : 'password'}
                name="password"
                placeholder="Crea una contraseña segura"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button type="button" className="btn-ojo"
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {verPassword ? <IconoOjoAbierto /> : <IconoOjoCerrado />}
              </button>
            </div>
            <PasswordChecklist password={form.password} />
          </div>

          <div className="form-group">
            <label>Confirmar contraseña</label>
            <div className="input-con-icono">
              <input
                type={verConfirm ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button type="button" className="btn-ojo"
                onClick={() => setVerConfirm(!verConfirm)}
                aria-label={verConfirm ? 'Ocultar' : 'Mostrar'}>
                {verConfirm ? <IconoOjoAbierto /> : <IconoOjoCerrado />}
              </button>
            </div>
            {form.confirmPassword.length > 0 && !confirmValida && (
              <p className="error">Las contraseñas no coinciden</p>
            )}
          </div>

          <button type="submit" disabled={!paso1Completo}>Continuar</button>
          <button type="button" className="btn-switch" onClick={onSwitch}>
            ¿Ya tienes cuenta? <strong>Inicia sesión</strong>
          </button>
        </form>
      )}

      {paso === 2 && (
        <form onSubmit={handleRegistro}>
          {error && <p className="error">{error}</p>}

          <div className="form-group" style={{ animationDelay: '0.03s' }}>
            <label>Nombre completo</label>
            <input type="text" name="nombre" placeholder="Juan Pérez"
              value={form.nombre} onChange={handleChange} autoComplete="name" required />
          </div>

          <div className="form-group" style={{ animationDelay: '0.06s' }}>
            <label>Peso (kg)</label>
            <input type="number" name="peso" step="0.1" placeholder="70"
              value={form.peso} onChange={handleChange} />
          </div>

          <div className="form-group" style={{ animationDelay: '0.09s' }}>
            <label>Altura (m)</label>
            <input type="number" name="altura" step="0.01" placeholder="1.75"
              value={form.altura} onChange={handleChange} />
          </div>

          <div className="form-group" style={{ animationDelay: '0.12s' }}>
            <label>Fecha de nacimiento</label>
            <input type="date" name="fecha_nacimiento"
              value={form.fecha_nacimiento} onChange={handleChange} />
          </div>

          <div className="form-group" style={{ animationDelay: '0.15s' }}>
            <label>Género</label>
            <CustomSelect
              name="genero"
              value={form.genero}
              onChange={handleChange}
              options={OPCIONES_GENERO}
              placeholder="Seleccionar"
            />
          </div>

          <div className="form-group" style={{ animationDelay: '0.18s' }}>
            <label>Meta</label>
            <CustomSelect
              name="meta"
              value={form.meta}
              onChange={handleChange}
              options={OPCIONES_META}
              placeholder="Seleccionar"
            />
          </div>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <button type="button" className="btn-secundario" onClick={handleAtras}>Atrás</button>
        </form>
      )}
    </>
  )
}