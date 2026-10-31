import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Login from '../components/Auth/Login'
import Registro from '../components/Auth/Registro'
import RecuperarPassword from '../components/Auth/RecuperarPassword'
import '../css/styles.css'

const TITULOS = {
  registro: 'Registro - Body Rhythm',
  login: 'Iniciar Sesión - Body Rhythm',
  recuperar: 'Recuperar contraseña',
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const modoInicial = searchParams.get('modo') || 'registro'
  const [modo, setModo] = useState(modoInicial)

  return (
    <div className="auth-wrapper">
      <div className="container">
        <h2>{TITULOS[modo] || TITULOS.login}</h2>

        {modo === 'registro' && <Registro onSwitch={() => setModo('login')} />}
        {modo === 'recuperar' && <RecuperarPassword onVolver={() => setModo('login')} />}
        {modo !== 'registro' && modo !== 'recuperar' && (
          <Login onSwitch={() => setModo('registro')} onOlvide={() => setModo('recuperar')} />
        )}
      </div>
    </div>
  )
}
