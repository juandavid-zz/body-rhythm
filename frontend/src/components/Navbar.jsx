import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const [autenticado, setAutenticado] = useState(Boolean(localStorage.getItem('token')))

  useEffect(() => {
    // Si el token cambia en otra pestaña (login/logout), este navbar se entera.
    const onStorage = () => setAutenticado(Boolean(localStorage.getItem('token')))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    setAutenticado(false)
    navigate('/')
  }

  return (
    <nav>
      <a href="/" className="logo">
        Body <span>Rhythm</span>
      </a>
      <ul className="nav-links">
        <li><a href="#">Inicio</a></li>
        <li><a href="#">Entrenamientos</a></li>
        <li><a href="#">Nutrición</a></li>
        <li><a href="#">Planes</a></li>
      </ul>

      {autenticado ? (
        <button className="btn-cerrar-sesion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      ) : (
        <>
          <button className="btn-iniciar" onClick={() => navigate('/auth?modo=login')}>
            Iniciar Sesión
          </button>
          <button className="btn-registro" onClick={() => navigate('/auth?modo=registro')}>
            Regístrate
          </button>
        </>
      )}
    </nav>
  )
}