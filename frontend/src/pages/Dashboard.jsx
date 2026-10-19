import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import Navbar from '../components/Navbar'
import { formatearDuracion, formatearNumero, tiempoRelativo } from '../utils/formato'
import '../css/entrenamientos.css'

const IconoIA = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
)

const DIA_MS = 86400000
const inicioDelDia = (fecha) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Entrenamientos, minutos y racha de los últimos 7 días
function calcularResumen(registros) {
  const hoy = inicioDelDia(Date.now())
  const desde = hoy - 6 * DIA_MS
  const dias = new Set(registros.map((r) => inicioDelDia(r.fecha)))
  const semana = registros.filter((r) => inicioDelDia(r.fecha) >= desde)

  // Racha: días seguidos con entrenamiento, contando desde hoy (o desde ayer si hoy aún no)
  let racha = 0
  let cursor = dias.has(hoy) ? hoy : hoy - DIA_MS
  while (dias.has(cursor)) {
    racha += 1
    cursor -= DIA_MS
  }

  return {
    entrenamientos: semana.length,
    minutos: Math.round(semana.reduce((total, r) => total + (r.duracion_segundos || 0), 0) / 60),
    racha,
  }
}

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const nombre = (localStorage.getItem('nombre') || '').split(' ')[0]
  const [estado, setEstado] = useState({ cargando: true, registros: [] })

  useEffect(() => {
    let activo = true
    api
      .get('/entrenamientos/registros/')
      .then((res) => activo && setEstado({ cargando: false, registros: res.data }))
      .catch(() => activo && setEstado({ cargando: false, registros: [] }))
    return () => {
      activo = false
    }
  }, [])

  const resumen = useMemo(() => calcularResumen(estado.registros), [estado.registros])
  const recientes = estado.registros.slice(0, 3)

  return (
    <>
      <Navbar />
      <main className="lg-page">
        {/* Color detrás del vidrio: sin él, el vidrio no tiene qué refractar */}
        <div className="lg-fondo" aria-hidden="true">
          <span className="lg-orbe uno" />
          <span className="lg-orbe dos" />
          <span className="lg-orbe tres" />
        </div>

        <div className="lg-contenedor">
          {/* ── Lo principal: crear la rutina con IA ── */}
          <section className="lg-glass lg-hero">
            <p className="lg-etiqueta">{saludo()}{nombre ? `, ${nombre}` : ''}</p>
            <h1>¿Qué entrenamos hoy?</h1>
            <p className="lg-hero-texto">
              Cuéntale al asistente dónde entrenas y qué equipo tienes, y te arma una rutina para tu meta.
            </p>

            <button type="button" className="lg-cta" onClick={() => navigate('/chatbot')}>
              <IconoIA />
              Crear mi rutina con IA
            </button>

            <button type="button" className="lg-link" onClick={() => navigate('/rutinas')}>
              o entrena con una de mis rutinas
            </button>
          </section>

          <div className="lg-fila">
            {/* ── Semana ── */}
            <section className="lg-glass lg-semana" aria-label="Resumen de los últimos 7 días">
              <p className="lg-etiqueta">Últimos 7 días</p>
              <dl className="lg-stats">
                <div>
                  <dt>Entrenamientos</dt>
                  <dd>{estado.cargando ? '–' : resumen.entrenamientos}</dd>
                </div>
                <div>
                  <dt>Minutos</dt>
                  <dd>{estado.cargando ? '–' : formatearNumero(resumen.minutos)}</dd>
                </div>
                <div>
                  <dt>Racha</dt>
                  <dd>{estado.cargando ? '–' : `${resumen.racha} ${resumen.racha === 1 ? 'día' : 'días'}`}</dd>
                </div>
              </dl>
            </section>

            {/* ── Recientes ── */}
            <section className="lg-glass lg-recientes">
              <div className="lg-cabecera">
                <p className="lg-etiqueta">Últimos entrenamientos</p>
                {recientes.length > 0 && (
                  <button type="button" className="lg-link" onClick={() => navigate('/perfil')}>
                    Ver todo
                  </button>
                )}
              </div>

              {estado.cargando && <p className="lg-vacio">Cargando…</p>}
              {!estado.cargando && recientes.length === 0 && (
                <p className="lg-vacio">Cuando termines tu primer entrenamiento aparecerá aquí.</p>
              )}

              <ul className="lg-lista">
                {recientes.map((r) => (
                  <li key={r.id}>
                    <div className="lg-lista-texto">
                      <strong>{r.nombre}</strong>
                      <span>{tiempoRelativo(r.fecha)}</span>
                    </div>
                    <span className="lg-lista-dato">{formatearDuracion(r.duracion_segundos)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
