import { useNavigate } from 'react-router-dom'
import logoBodyRhythm from '../assets/logo.png'
import heroBg from '../assets/gym-fondo.jpg'
export default function Hero() {
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const logueado = !!token

  return (
    <section className="hero">

      <div className="hero-left">

        <h1>
          Transforma Tu Cuerpo,
        </h1>

        <span className="h1-accent">
          Transforma Tu<br />
          Vida
        </span>

        <p className="hero-sub">
          Únete a miles de personas que ya están transformando
          su cuerpo con nuestros programas personalizados.
        </p>

        <div className="hero-btns">
          <button
            className="btn-primary"
            onClick={() =>
              navigate(
                logueado
                  ? '/planes'
                  : '/auth?modo=registro'
              )
            }
          >
            {logueado
              ? 'Ver Planes →'
              : 'Comenzar Ahora →'}
          </button>
        </div>

      </div>

      <div className="hero-right">

        <div className="visual-card">

          <img
            src={logoBodyRhythm}
            alt="Body Rhythm"
            className="hero-logo"
          />

        </div>

      </div>

    </section>
  )
}