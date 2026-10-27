import { useNavigate } from 'react-router-dom'
import logoBodyRhythm from '../assets/logo.png'
export default function Hero() {
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const logueado = !!token

  return (
    <section className="hero">

      <div className="hero-left">

        <span className="hero-pill">Entrena. Come bien. Repite.</span>

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

          <button
            className="btn-secundario"
            onClick={() =>
              document
                .getElementById('beneficios')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Conocer más
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

          <div className="hero-chip hero-chip-a">
            <span className="hero-chip-dot" />
            Rutinas a tu medida
          </div>
          <div className="hero-chip hero-chip-b">
            <span className="hero-chip-dot rosa" />
            Nutrición personalizada
          </div>
          <div className="hero-chip hero-chip-c">
            <span className="hero-chip-dot" />
            Progreso real
          </div>

        </div>

      </div>

    </section>
  )
}