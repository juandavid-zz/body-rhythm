import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'

const SEMANAS = [4, 6, 8, 12]
const DESCARGAS = [
  { valor: 4, texto: 'Cada 4 semanas' },
  { valor: 5, texto: 'Cada 5 semanas' },
  { valor: 6, texto: 'Cada 6 semanas' },
  { valor: 0, texto: 'Sin descarga' },
]

// ── Crear un programa: nombre, duración, descarga y rutinas en orden ──
function CrearPrograma({ onCreado, onCerrar }) {
  const [rutinas, setRutinas] = useState(null)
  const [nombre, setNombre] = useState('Mi programa')
  const [semanas, setSemanas] = useState(6)
  const [descarga, setDescarga] = useState(4)
  const [elegidas, setElegidas] = useState([]) // ids en el orden en que se tocan
  const [estado, setEstado] = useState({ guardando: false, error: '' })

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        const { data: yo } = await api.get('/usuarios/me/')
        const { data } = await api.get(`/usuarios/${yo.id}/rutinas/`)
        // Solo rutinas con ejercicios: una vacía no se puede entrenar
        if (activo) setRutinas(data.filter((r) => (r.ejercicios_detalle || []).length > 0))
      } catch {
        if (activo) setRutinas([])
      }
    })()
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const cerrar = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [onCerrar])

  const alternar = (id) =>
    setElegidas((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : actual.length < 7 ? [...actual, id] : actual))

  const crear = async (e) => {
    e.preventDefault()
    setEstado({ guardando: true, error: '' })
    try {
      const { data } = await api.post('/entrenamientos/programa/', {
        nombre, semanas, descarga_cada: descarga, rutinas: elegidas,
      })
      onCreado(data)
    } catch (error) {
      setEstado({ guardando: false, error: error.response?.data?.error || 'No se pudo crear el programa.' })
    }
  }

  // En un portal: dentro de la página quedaría debajo de la navbar
  return createPortal(
    <div className="lg-modal-fondo" onClick={onCerrar}>
      <form className="lg-modal" role="dialog" aria-modal="true" aria-label="Crear programa" onClick={(e) => e.stopPropagation()} onSubmit={crear}>
        <header className="lg-modal-cabecera">
          <h2>Nuevo programa</h2>
          <button type="button" className="lg-modal-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        <p className="lg-modal-texto">
          Elige tus rutinas en el orden en que las quieres hacer cada semana. Cada vez que entrenes te diremos cuánto levantar.
        </p>

        <label className="lg-campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} />
        </label>

        <div className="lg-campos-fila">
          <label className="lg-campo">
            <span>Duración</span>
            <select value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
              {SEMANAS.map((s) => <option key={s} value={s}>{s} semanas</option>)}
            </select>
          </label>
          <label className="lg-campo">
            <span>Semana de descarga</span>
            <select value={descarga} onChange={(e) => setDescarga(Number(e.target.value))}>
              {DESCARGAS.map((d) => <option key={d.valor} value={d.valor}>{d.texto}</option>)}
            </select>
          </label>
        </div>

        <p className="lg-campo-titulo">Rutinas de la semana <small>({elegidas.length}/7)</small></p>
        {rutinas === null && <p className="lg-vacio">Cargando tus rutinas…</p>}
        {rutinas?.length === 0 && <p className="lg-vacio">Primero crea o guarda una rutina con ejercicios.</p>}
        {rutinas?.length > 0 && (
          <ul className="lg-elegir-rutinas">
            {rutinas.map((r) => {
              const posicion = elegidas.indexOf(r.id)
              return (
                <li key={r.id}>
                  <button type="button" className={posicion >= 0 ? 'elegida' : ''} onClick={() => alternar(r.id)} aria-pressed={posicion >= 0}>
                    <span className="lg-orden">{posicion >= 0 ? posicion + 1 : ''}</span>
                    <span className="lg-elegir-texto">
                      <strong>{r.nombre}</strong>
                      <small>{r.ejercicios_detalle.length} ejercicios</small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {estado.error && <p className="lg-error">{estado.error}</p>}

        <div className="lg-modal-pie">
          <button type="button" className="lg-boton" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="lg-boton primario" disabled={!elegidas.length || estado.guardando}>
            {estado.guardando ? 'Creando…' : 'Crear programa'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

/** Tarjeta de Entrenamientos: tu programa en curso y qué toca hoy (o la invitación a crear uno). */
export default function ProgramaTarjeta() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    let activo = true
    api
      .get('/entrenamientos/programa/')
      .then((res) => activo && setDatos(res.data))
      .catch(() => activo && setDatos({ programa: null }))
    return () => {
      activo = false
    }
  }, [])

  const terminar = async () => {
    await api.delete('/entrenamientos/programa/')
    setDatos({ programa: null })
  }

  const empezar = () => navigate('/rutinas/entrenamiento', { state: { rutina: datos.hoy_toca } })

  if (!datos) return null

  const modal = creando && (
    <CrearPrograma
      onCerrar={() => setCreando(false)}
      onCreado={(nuevo) => {
        setDatos(nuevo)
        setCreando(false)
      }}
    />
  )

  if (!datos.programa) {
    return (
      <>
        <section className="lg-glass lg-programa lg-programa-vacio">
          <div>
            <p className="lg-etiqueta">Programa</p>
            <h2>Entrena con un plan de varias semanas</h2>
            <p>Ordena tus rutinas en la semana y la app te dice qué toca hoy y cuánto levantar, con semanas de descarga para recuperar.</p>
          </div>
          <button type="button" className="lg-boton primario" onClick={() => setCreando(true)}>Crear programa</button>
        </section>
        {modal}
      </>
    )
  }

  const { programa, semana, sesiones, hoy_toca: hoyToca } = datos
  const hechas = sesiones.filter((s) => s.hecha).length
  // La que toca hoy es la primera pendiente (aunque la rutina se repita en la semana)
  const actual = hoyToca ? sesiones.findIndex((s) => !s.hecha) : -1

  return (
    <>
      <section className="lg-glass lg-programa">
        <div className="lg-programa-cabecera">
          <div>
            <p className="lg-etiqueta">{programa.nombre}</p>
            <h2>
              {datos.terminado ? '¡Programa terminado!' : `Semana ${semana} de ${programa.semanas}`}
              {datos.descarga && <span className="lg-insignia">Descarga</span>}
            </h2>
          </div>
          <div className="lg-programa-acciones">
            <button type="button" className="lg-link" onClick={() => setCreando(true)}>Nuevo</button>
            <button type="button" className="lg-link" onClick={terminar}>Terminar</button>
          </div>
        </div>

        {!datos.terminado && (
          <>
            <div className="lg-progreso-programa" aria-label={`Semana ${semana} de ${programa.semanas}`}>
              <span style={{ width: `${Math.round(((semana - 1) / programa.semanas) * 100)}%` }} />
            </div>

            <ol className="lg-sesiones">
              {sesiones.map((s, i) => (
                <li key={s.orden} className={s.hecha ? 'hecha' : i === actual ? 'actual' : ''}>
                  <span className="lg-sesion-marca" aria-hidden="true">{s.hecha ? '✓' : s.orden}</span>
                  {s.rutina.nombre}
                </li>
              ))}
            </ol>

            {datos.descarga && (
              <p className="lg-nota-descarga">Esta semana las cargas sugeridas bajan un 10 % para que te recuperes.</p>
            )}

            {hoyToca ? (
              <div className="lg-hoy-toca">
                <div>
                  <small>Hoy toca · {hechas} de {sesiones.length} esta semana</small>
                  <strong>{hoyToca.nombre}</strong>
                </div>
                <button type="button" className="lg-boton primario" onClick={empezar}>Empezar</button>
              </div>
            ) : (
              <p className="lg-semana-lista">Semana completa. ¡Buen trabajo! La próxima arranca el lunes.</p>
            )}
          </>
        )}

        {datos.terminado && (
          <div className="lg-hoy-toca">
            <p>Completaste las {programa.semanas} semanas. Arma el siguiente bloque para seguir progresando.</p>
            <button type="button" className="lg-boton primario" onClick={() => setCreando(true)}>Nuevo programa</button>
          </div>
        )}
      </section>
      {modal}
    </>
  )
}
