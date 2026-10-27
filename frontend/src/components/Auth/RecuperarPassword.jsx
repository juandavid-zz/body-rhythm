import { useEffect, useState } from 'react'
import api from '../../api/api'
import PasswordChecklist from './PasswordChecklist'
import { cumpleMinimoBackend } from './passwordUtils'

const ESPERA_REENVIO = 60

/**
 * "¿Olvidaste tu contraseña?" en dos pasos:
 * 1) se escribe el correo y llega un código de 6 dígitos;
 * 2) con ese código se crea la contraseña nueva.
 */
export default function RecuperarPassword({ onVolver }) {
  const [paso, setPaso] = useState('correo')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return undefined
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  const pedirCodigo = async (e) => {
    e?.preventDefault()
    setError('')
    setAviso('')
    setCargando(true)
    try {
      const res = await api.post('/recuperar-password/', { email: email.trim() })
      setAviso(res.data.mensaje)
      setPaso('codigo')
      setCodigo('')
      setEspera(ESPERA_REENVIO)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'No pudimos enviar el código. Intenta más tarde.')
    } finally {
      setCargando(false)
    }
  }

  const cambiarPassword = async (e) => {
    e.preventDefault()
    setError('')
    setAviso('')
    setCargando(true)
    try {
      const res = await api.post('/restablecer-password/', { email: email.trim(), codigo, password })
      setAviso(res.data.mensaje)
      setPaso('listo')
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.error || data.detail || 'No pudimos cambiar la contraseña.')
      if (data.expirado) setCodigo('')
    } finally {
      setCargando(false)
    }
  }

  if (paso === 'listo') {
    return (
      <div className="codigo-verificacion recuperar">
        <p className="exito">{aviso}</p>
        <button type="button" onClick={onVolver}>Iniciar sesión</button>
      </div>
    )
  }

  if (paso === 'correo') {
    return (
      <div className="codigo-verificacion recuperar">
        <p className="codigo-texto">
          Escribe el correo de tu cuenta y te enviaremos un código para crear una contraseña nueva.
        </p>
        <form onSubmit={pedirCodigo}>
          <div className="form-group">
            <label htmlFor="recuperar-email">Correo</label>
            <input
              id="recuperar-email"
              type="email"
              placeholder="usuario@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={cargando || !email.trim()}>
            {cargando ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
        <button type="button" className="btn-switch" onClick={onVolver}>
          ¿La recordaste? <strong>Volver a iniciar sesión</strong>
        </button>
      </div>
    )
  }

  return (
    <div className="codigo-verificacion recuperar">
      <p className="codigo-texto">
        {aviso} Revisa <strong>{email}</strong> (también en spam).
      </p>
      <form onSubmit={cambiarPassword}>
        <div className="form-group">
          <label htmlFor="recuperar-codigo">Código</label>
          <input
            id="recuperar-codigo"
            className="codigo-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="recuperar-password">Contraseña nueva</label>
          <input
            id="recuperar-password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordChecklist password={password} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando || codigo.length !== 6 || !cumpleMinimoBackend(password)}>
          {cargando ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
      <button type="button" className="btn-secundario" onClick={pedirCodigo} disabled={cargando || espera > 0}>
        {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
      </button>
      <button type="button" className="btn-switch" onClick={onVolver}>
        <strong>Volver a iniciar sesión</strong>
      </button>
    </div>
  )
}
