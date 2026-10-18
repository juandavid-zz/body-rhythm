import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import Navbar from '../components/Navbar'
import { formatearDuracion, formatearNumero, tiempoRelativo } from '../utils/formato'
import '../css/entrenamientos.css'

const SECCIONES = [
  {
    icono: '🤖',
    titulo: 'Generar rutina con IA',
    texto: 'El asistente arma una rutina según tu IMC, tu meta y el equipo que tienes. Guárdala y entrénala.',
    accion: 'Abrir asistente',
    ruta: '/chatbot',
    destacada: true,
  },
  {
    icono: '🏋️',
    titulo: 'Mis rutinas',
    texto: 'Elige una rutina, registra peso y repeticiones de cada serie y lleva el control del descanso.',
    accion: 'Registrar entrenamiento',
    ruta: '/rutinas',
  },
  {
    icono: '📚',
    titulo: 'Biblioteca de ejercicios',
    texto: 'Más de 370 ejercicios con imágenes, músculos trabajados y tu historial en cada uno.',
    accion: 'Ver ejercicios',
    ruta: '/ejercicios',
  },
  {
    icono: '📈',
    titulo: 'Progreso',
    texto: 'Revisa tu IMC y cómo evolucionan tus marcas con el tiempo.',
    accion: 'Ver progreso',
    ruta: '/progreso',
  },
  {
    icono: '🥗',
    titulo: 'Nutrición',
    texto: 'Tu plan de comidas y el registro de lo que comes cada día.',
    accion: 'Ir a nutrición',
    ruta: '/nutricion',
  },
  {
    icono: '👥',
    titulo: 'Comunidad',
    texto: 'Sigue a otras personas y mira sus entrenamientos en el feed.',
    accion: 'Ir a comunidad',
    ruta: '/comunidad',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const nombre = (localStorage.getItem('nombre') || '').split(' ')[0]
  const [recientes, setRecientes] = useState({ cargando: true, registros: [] })

  useEffect(() => {
    let activo = true
    api
      .get('/entrenamientos/registros/')
      .then((res) => activo && setRecientes({ cargando: false, registros: res.data.slice(0, 3) }))
      .catch(() => activo && setRecientes({ cargando: false, registros: [] }))
    return () => {
      activo = false
    }
  }, [])

  return (
    <>
      <Navbar />
      <main className="ent-page">
        <div className="ent-contenedor">
          <header className="ent-hero">
            <div>
              <span className="ent-kicker">Entrenamientos</span>
              <h1>{nombre ? `¡Vamos, ${nombre}!` : 'Tu centro de entrenamiento'}</h1>
              <p>Genera rutinas, regístralas serie por serie y sigue tu progreso.</p>
            </div>
            <button type="button" className="ent-btn-primario" onClick={() => navigate('/rutinas')}>
              Empezar a entrenar
            </button>
          </header>

          <section className="ent-grid" aria-label="Secciones">
            {SECCIONES.map((seccion) => (
              <button
                key={seccion.ruta}
                type="button"
                className={`ent-card ${seccion.destacada ? 'destacada' : ''}`}
                onClick={() => navigate(seccion.ruta)}
              >
                <span className="ent-card-icono" aria-hidden="true">{seccion.icono}</span>
                <h2>{seccion.titulo}</h2>
                <p>{seccion.texto}</p>
                <span className="ent-card-accion">{seccion.accion} →</span>
              </button>
            ))}
          </section>

          <section className="ent-recientes">
            <div className="ent-recientes-cabecera">
              <span className="ent-kicker">Últimos entrenamientos</span>
              <button type="button" className="ent-link" onClick={() => navigate('/perfil')}>
                Ver todos
              </button>
            </div>

            {recientes.cargando && <p className="ent-vacio">Cargando…</p>}
            {!recientes.cargando && recientes.registros.length === 0 && (
              <p className="ent-vacio">
                Todavía no has terminado ningún entrenamiento. Elige una rutina y registra tu primera sesión.
              </p>
            )}

            <ul className="ent-lista">
              {recientes.registros.map((registro) => (
                <li key={registro.id}>
                  <div>
                    <strong>{registro.nombre}</strong>
                    <span>{tiempoRelativo(registro.fecha)}</span>
                  </div>
                  <div className="ent-lista-datos">
                    <span>{formatearDuracion(registro.duracion_segundos)}</span>
                    <span>{registro.series_completadas} series</span>
                    <span>{formatearNumero(registro.volumen_kg)} kg</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  )
}
