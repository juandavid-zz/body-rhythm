import { useNavigate } from 'react-router-dom'

export default function Hero() {
  const navigate = useNavigate()

  return (
    <section className="hero">
      <div className="hero-left">
        <h1>Transforma Tu Cuerpo,</h1>
        <span className="h1-accent">Transforma Tu<br />Vida</span>
        <p className="hero-sub">
          Únete a miles de personas que ya están transformando su cuerpo con nuestros programas personalizados.
        </p>
        <div className="hero-btns">
          <button
            className="btn-primary"
            onClick={() => navigate('/auth?modo=registro')}
          >
            Comenzar Ahora →
          </button>
        </div>
      </div>
      <div className="hero-right">
        <div className="visual-card">
          <span className="lifter-emoji">🏋️</span>
        </div>
      </div>
    </section>
  )
}