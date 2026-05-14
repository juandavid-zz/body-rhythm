import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

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
      <button className="btn-iniciar" onClick={() => navigate('/auth?modo=login')}>
        Iniciar Sesión
      </button>
      <button className="btn-registro" onClick={() => navigate('/auth?modo=registro')}>
        Regístrate
      </button>
    </nav>
  )
}