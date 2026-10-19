import { useNavigate, useLocation } from 'react-router-dom'
import CodigoVerificacion from '../components/Auth/CodigoVerificacion'
import './../css/styles.css'

export default function EsperandoVerificacion() {
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const email = params.get('email') || ''

  return (
    <div className="auth-wrapper">
      <div className="container verification-card">
        
        <div className="verification-icon" aria-hidden="true">
          ✉
        </div>

        <div className="verification-badge">
          VERIFICACIÓN DE CUENTA
        </div>

        <h1>Revisa tu correo</h1>

        <p className="verification-main-text">
          Hemos enviado un correo de confirmación para activar tu cuenta de
          <strong> Body Rhythm</strong>.
        </p>

        {email && (
          <div className="verification-email">
            <span>Correo registrado</span>
            <strong>{email}</strong>
          </div>
        )}

        <div className="verification-steps">
          <div className="verification-step">
            <span>1</span>
            <p>Abre tu correo electrónico.</p>
          </div>

          <div className="verification-step">
            <span>2</span>
            <p>Busca el mensaje de Body Rhythm.</p>
          </div>

          <div className="verification-step">
            <span>3</span>
            <p>Escribe el código de 6 dígitos o abre el enlace.</p>
          </div>
        </div>

        <div className="verification-note">
          <span>⏱</span>
          <p>
            El enlace de verificación es válido durante <strong>24 horas</strong>.
          </p>
        </div>

        {email ? (
          <CodigoVerificacion email={email} recienEnviado={false} />
        ) : (
          <p className="error">Vuelve a iniciar sesión para recibir el código.</p>
        )}

        <div className="verification-actions">
          <button
            className="verification-secondary-btn"
            type="button"
            onClick={() => navigate('/auth?modo=login')}
          >
            Volver a iniciar sesión
          </button>
        </div>

        <p className="verification-footer">
          ¿No encuentras el correo? Revisa también tu carpeta de
          <strong> spam o correo no deseado</strong>.
        </p>

      </div>
    </div>
  )
}

