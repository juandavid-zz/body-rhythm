import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Login from '../components/Auth/Login'
import Registro from '../components/Auth/Registro'
import '../css/styles.css'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const modoInicial = searchParams.get('modo') || 'registro'
  const [modo, setModo] = useState(modoInicial)

  return (
    <div className="auth-wrapper">
      <div className="container">
        <h2>
          {modo === 'registro'
            ? 'Registro - Body Rhythm'
            : 'Iniciar Sesión - Body Rhythm'}
        </h2>

        {modo === 'registro'
          ? <Registro onSwitch={() => setModo('login')} />
          : <Login onSwitch={() => setModo('registro')} />
        }
      </div>
    </div>
  )
}