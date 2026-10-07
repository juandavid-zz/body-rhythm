import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/api'
import './../css/styles.css'

export default function VerificarPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const yaCorrio = useRef(false)

  const [estado, setEstado] = useState('cargando')
  const [mensaje, setMensaje] = useState('Estamos confirmando tu cuenta...')
  const [email, setEmail] = useState('')
  const [reenviando, setReenviando] = useState(false)

  useEffect(() => {
    if (yaCorrio.current) return
    yaCorrio.current = true

    const verificar = async () => {
      try {
        const res = await api.get(`/verificar/${token}/`)
        if (res.data.token) localStorage.setItem('token', res.data.token)
        setEstado('ok')
        setMensaje(res.data.mensaje || 'Cuenta confirmada correctamente.')
      } catch (err) {
        const data = err.response?.data || {}
        setEmail(data.email || '')
        setEstado(data.expirado ? 'expirado' : 'error')
        setMensaje(data.error || 'No pudimos confirmar tu cuenta.')
      }
    }

    verificar()
  }, [token])

  const reenviar = async () => {
    if (!email) return
    setReenviando(true)
    try {
      const res = await api.post('/reenviar-verificacion/', { email })
      setMensaje(res.data.mensaje || 'Te enviamos un nuevo enlace.')
    } catch (err) {
      setMensaje(err.response?.data?.error || 'No pudimos reenviar el correo, inténtalo nuevamente.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="container verification-card">
        <div className="br-auth-icon" aria-hidden="true">
          {estado === 'ok' ? '✓' : estado === 'cargando' ? '…' : '!' }
        </div>

        <h2>
          {estado === 'ok' ? 'Cuenta confirmada' : 'Confirmación de cuenta'}
        </h2>

        {estado === 'cargando' && (
          <p className="br-auth-verification-message">{mensaje}</p>
        )}

        {estado === 'ok' && (
          <>
            <p className="br-auth-message br-auth-message-success">{mensaje}</p>
            <p className="br-auth-verification-message">Ya puedes empezar a entrenar con Body Rhythm.</p>
            <div className="br-auth-actions">
            <button
  className="br-auth-btn br-auth-btn-primary"
  type="button"
  onClick={() => navigate('/')}
>
  Ir al inicio
</button>
            </div>
          </>
        )}

        {estado === 'expirado' && (
          <>
            <p className="br-auth-message br-auth-message-warning">{mensaje}</p>
            <div className="br-auth-actions">
              <button className="br-auth-btn br-auth-btn-primary" type="button" onClick={reenviar} disabled={reenviando || !email}>
                {reenviando ? 'Enviando enlace...' : 'Enviarme un enlace nuevo'}
              </button>
              <button className="br-auth-btn br-auth-btn-secondary" type="button" onClick={() => navigate('/auth?modo=login')}>
                Volver a iniciar sesión
              </button>
            </div>
          </>
        )}

        {estado === 'error' && (
          <>
            <p className="br-auth-message br-auth-message-error">{mensaje}</p>
            <div className="br-auth-actions">
              <button className="br-auth-btn br-auth-btn-primary" type="button" onClick={() => navigate('/auth?modo=login')}>
                Volver a iniciar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
