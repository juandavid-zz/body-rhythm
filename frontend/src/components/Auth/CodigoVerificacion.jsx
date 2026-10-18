import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'

const ESPERA_REENVIO = 60

/**
 * Formulario para activar la cuenta con el código de 6 dígitos del correo.
 * Incluye el reenvío del correo (con espera de 60 s) y, en desarrollo sin
 * correo configurado, el enlace para verificar sin buzón.
 */
export default function CodigoVerificacion({ email, envioInicial, recienEnviado = true }) {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [envio, setEnvio] = useState(envioInicial || { correo_enviado: true })
  const [espera, setEspera] = useState(recienEnviado ? ESPERA_REENVIO : 0)

  useEffect(() => {
    if (espera <= 0) return undefined
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  const iniciarSesion = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('refresh', data.refresh)
    if (data.nombre) localStorage.setItem('nombre', data.nombre)
    if (data.username) localStorage.setItem('username', data.username)
    navigate('/')
  }

  const verificar = async (e) => {
    e.preventDefault()
    setError('')
    setVerificando(true)
    try {
      const res = await api.post('/verificar-codigo/', { email, codigo })
      if (res.data.ya_verificada) {
        navigate('/auth?modo=login')
        return
      }
      iniciarSesion(res.data)
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.error || 'No pudimos verificar el código.')
      if (data.expirado) setCodigo('')
    } finally {
      setVerificando(false)
    }
  }

  const reenviar = async () => {
    setError('')
    setAviso('')
    setReenviando(true)
    try {
      const res = await api.post('/reenviar-verificacion/', { email })
      setEnvio(res.data)
      setCodigo('')
      setEspera(ESPERA_REENVIO)
      if (res.data.correo_enviado) setAviso('Te enviamos un código nuevo 📩')
      else if (!res.data.enlace_desarrollo) setError('No pudimos enviar el correo. Intenta más tarde.')
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.error || 'No pudimos reenviar el correo.')
      if (data.espera_segundos) setEspera(data.espera_segundos)
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="codigo-verificacion">
      {envio.correo_enviado ? (
        <p className="codigo-texto">
          Te enviamos un código de 6 dígitos a <strong>{email}</strong>.
          Escríbelo aquí o abre el enlace del correo. Si no lo ves, revisa spam.
        </p>
      ) : envio.enlace_desarrollo ? (
        <div className="aviso-desarrollo">
          <p>
            <strong>Modo desarrollo:</strong> el envío de correos no está configurado en
            el backend (.env), así que el correo no salió. El código está en la consola del
            backend, o usa este enlace:
          </p>
          <a href={envio.enlace_desarrollo}>Confirmar mi cuenta</a>
        </div>
      ) : (
        <p className="error">
          No pudimos enviar el correo a <strong>{email}</strong>. Pide que te lo reenviemos.
        </p>
      )}

      <form onSubmit={verificar}>
        <div className="form-group">
          <label htmlFor="codigo-verificacion">Código de verificación</label>
          <input
            id="codigo-verificacion"
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

        {error && <p className="error">{error}</p>}
        {aviso && <p className="exito">{aviso}</p>}

        <button type="submit" disabled={codigo.length !== 6 || verificando}>
          {verificando ? 'Verificando...' : 'Verificar cuenta'}
        </button>
      </form>

      <button
        type="button"
        className="btn-secundario"
        onClick={reenviar}
        disabled={reenviando || espera > 0}
      >
        {reenviando
          ? 'Enviando...'
          : espera > 0
            ? `Reenviar código en ${espera} s`
            : 'Reenviar código'}
      </button>
    </div>
  )
}
