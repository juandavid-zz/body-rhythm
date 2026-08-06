import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const logueado = !!localStorage.getItem('token')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    navigate('/')
    window.location.reload()
  }

  const irAEntrenamientos = () => {
    if (logueado) {
      navigate('/dashboard')
    } else {
      navigate('/auth?modo=login')
    }
  }

  return (
    <nav>
      <a href="/" className="logo">
        Body <span>Rhythm</span>
      </a>
      <ul className="nav-links">
        <li><a href="/">Inicio</a></li>
        <li>
          <a href="#" onClick={(e) => { e.preventDefault(); irAEntrenamientos() }}>
            Entrenamientos
          </a>
        </li>
        <li><a href="#">Nutrición</a></li>
        <li><a href="#">Planes</a></li>
      </ul>

      {logueado ? (
        <button className="btn-iniciar" onClick={handleLogout}>
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