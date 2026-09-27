import { useState } from 'react'
import api from '../../api/api'

export default function Registro({ onSwitch }) {
  const [form, setForm] = useState({
    nombre: '', email: '', peso: '', altura: '',
    fecha_nacimiento: '', password: '', confirmPassword: '',
    genero: '', meta: ''
  })
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState('')
  const [cargando, setCargando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [mensajeReenvio, setMensajeReenvio] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeReenvio('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
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
      const correoEnviado = res.data.correo_enviado !== false
      setEnviado(res.data.email || form.email)
      if (!correoEnviado) {
        setError('La cuenta fue creada, pero no pudimos enviar el correo de confirmación. Puedes usar “Reenviar correo”.')
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.email?.[0] ||
        'No pudimos crear tu cuenta. Revisa los datos e inténtalo nuevamente.'
      )
    } finally {
      setCargando(false)
    }
  }

  const reenviar = async () => {
    setReenviando(true)
    setError('')
    setMensajeReenvio('')
    try {
      const res = await api.post('/reenviar-verificacion/', { email: enviado })
      if (res.data.correo_enviado === false) {
        setError(res.data.mensaje || 'No pudimos enviar el correo de confirmación.')
        return
      }
      setMensajeReenvio(res.data.mensaje || 'Nuevo enlace enviado. Revisa tu correo.')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'No pudimos reenviar el correo. Revisa la conexión o inténtalo nuevamente.'
      )
    } finally {
      setReenviando(false)
    }
  }

  if (enviado) {
    return (
      <section className="auth-confirmation" aria-live="polite">
        <div className="auth-confirmation-icon" aria-hidden="true">✉</div>
        <h3>Revisa tu correo</h3>
        <p>
          Enviamos un enlace de confirmación a{' '}
          <strong>{enviado}</strong>.
        </p>
        <p>
          Abre el enlace para activar tu cuenta. Si no lo encuentras,
          revisa spam o promociones.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {mensajeReenvio && <div className="auth-success">{mensajeReenvio}</div>}

        <div className="auth-confirmation-actions">
          <button
            className="auth-primary"
            type="button"
            onClick={reenviar}
            disabled={reenviando}
          >
            {reenviando ? 'Enviando enlace...' : 'Reenviar correo'}
          </button>

          <button className="auth-secondary" type="button" onClick={onSwitch}>
            Ya confirmé mi cuenta · Iniciar sesión
          </button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={handleRegistro}>
      {error && <div className="auth-error">{error}</div>}

      <label htmlFor="registro-nombre">Nombre completo</label>
      <input id="registro-nombre" type="text" name="nombre" placeholder="Juan Pérez"
        value={form.nombre} onChange={handleChange} required />

      <label htmlFor="registro-email">Correo electrónico</label>
      <input id="registro-email" type="email" name="email" placeholder="usuario@correo.com"
        value={form.email} onChange={handleChange} required />

      <label htmlFor="registro-peso">Peso (kg)</label>
      <input id="registro-peso" type="number" name="peso" step="0.1" placeholder="70"
        value={form.peso} onChange={handleChange} />

      <label htmlFor="registro-altura">Altura (m)</label>
      <input id="registro-altura" type="number" name="altura" step="0.01" placeholder="1.75"
        value={form.altura} onChange={handleChange} />

      <label htmlFor="registro-fecha">Fecha de nacimiento</label>
      <input id="registro-fecha" type="date" name="fecha_nacimiento"
        value={form.fecha_nacimiento} onChange={handleChange} />

      <label htmlFor="registro-genero">Género</label>
      <select id="registro-genero" name="genero" value={form.genero} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="masculino">Masculino</option>
        <option value="femenino">Femenino</option>
        <option value="otro">Otro</option>
      </select>

      <label htmlFor="registro-meta">Meta</label>
      <select id="registro-meta" name="meta" value={form.meta} onChange={handleChange}>
        <option value="">Seleccionar</option>
        <option value="perder_peso">Perder peso</option>
        <option value="ganar_musculo">Ganar músculo</option>
        <option value="mantenerse">Mantenerse</option>
        <option value="mejorar_resistencia">Mejorar resistencia</option>
      </select>

      <label htmlFor="registro-password">Contraseña</label>
      <input id="registro-password" type="password" name="password" placeholder="Mínimo 8 caracteres"
        value={form.password} onChange={handleChange} required />

      <label htmlFor="registro-confirm-password">Confirmar contraseña</label>
      <input id="registro-confirm-password" type="password" name="confirmPassword" placeholder="Repite tu contraseña"
        value={form.confirmPassword} onChange={handleChange} required />

      <button className="auth-submit" type="submit" disabled={cargando}>
        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
      <button className="auth-switch" type="button" onClick={onSwitch}>
        Ya tengo una cuenta
      </button>
    </form>
  )
}
