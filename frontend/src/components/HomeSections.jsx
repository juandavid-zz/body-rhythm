import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BENEFICIOS = [
  {
    numero: '01',
    etiqueta: 'Entrenamiento',
    titulo: 'Rutinas a tu medida',
    texto:
      'Rutinas recomendadas según tu perfil, o crea la tuya con los ejercicios de la biblioteca.',
    ruta: '/rutinas',
    color: '#3b1d6e',
  },
  {
    numero: '02',
    etiqueta: 'Alimentación',
    titulo: 'Nutrición personalizada',
    texto:
      'Un objetivo diario calculado para ti y planes alimenticios para registrar tus comidas.',
    ruta: '/nutricion',
    color: '#6b1f4f',
  },
  {
    numero: '03',
    etiqueta: 'Seguimiento',
    titulo: 'Progreso real',
    texto:
      'Mira cómo avanzas semana a semana y mantén la constancia que te lleva al resultado.',
    ruta: '/progreso',
    color: '#1e2a5e',
  },
]

const PASOS = [
  {
    numero: '1',
    titulo: 'Crea tu cuenta',
    texto: 'Regístrate y completa tu perfil con tu peso, altura y objetivo.',
  },
  {
    numero: '2',
    titulo: 'Elige tu plan',
    texto: 'Escoge el plan que mejor se adapte a tu ritmo y empieza hoy.',
  },
  {
    numero: '3',
    titulo: 'Entrena y come mejor',
    texto: 'Sigue tus rutinas, registra tus comidas y mira tu progreso crecer.',
  },
]

function useRevelar() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return [ref, visible]
}

export default function HomeSections() {
  const navigate = useNavigate()
  const logueado = !!localStorage.getItem('token')

  const [refBeneficios, vBeneficios] = useRevelar()
  const [refPasos, vPasos] = useRevelar()

  const ir = (ruta) => navigate(logueado ? ruta : '/auth?modo=login')

  return (
    <>
      <section
        id="beneficios"
        ref={refBeneficios}
        className={`home-section home-reveal ${vBeneficios ? 'home-reveal-on' : ''}`}
      >
        <span className="home-kicker">Todo en un solo lugar</span>
        <h2 className="home-title">Lo que te ofrece Body Rhythm</h2>

        <div className="home-cards">
          {BENEFICIOS.map((b) => (
            <a
              key={b.numero}
              href={b.ruta}
              className="home-card"
              onClick={(e) => {
                e.preventDefault()
                ir(b.ruta)
              }}
            >
              <div
                className="home-card-top"
                style={{ background: `linear-gradient(160deg, ${b.color}, #11142a)` }}
              >
                <span className="home-card-badge">{b.etiqueta}</span>
                <span className="home-card-num">{b.numero}</span>
                <h3>{b.titulo}</h3>
              </div>
              <div className="home-card-body">
                <p>{b.texto}</p>
                <span className="home-card-cta">Ver más →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section
        ref={refPasos}
        className={`home-section home-reveal ${vPasos ? 'home-reveal-on' : ''}`}
      >
        <span className="home-kicker">Cómo funciona</span>
        <h2 className="home-title">Empieza en tres pasos</h2>

        <div className="home-steps">
          {PASOS.map((p) => (
            <div key={p.numero} className="home-step">
              <span className="home-step-num">{p.numero}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
