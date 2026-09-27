import { useEffect, useMemo, useState } from 'react'
import api from '../api/api'
import '../css/nutricion.css'

const formatearTipo = (tipo) => {
  const tipos = {
    desayuno: 'Desayuno',
    almuerzo: 'Almuerzo',
    cena: 'Cena',
    snack: 'Snack',
  }

  return tipos[tipo] || 'Comida'
}

const formatearNumero = (valor, sufijo = '') => {
  if (valor === null || valor === undefined || valor === '') return '—'

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return '—'

  return `${Number.isInteger(numero) ? numero : numero.toFixed(1)}${sufijo}`
}

export default function NutricionPage() {
  const [planes, setPlanes] = useState([])
  const [registros, setRegistros] = useState([])
  const [objetivo, setObjetivo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoRegistros, setCargandoRegistros] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [registrandoComida, setRegistrandoComida] = useState(null)
  const [generandoPlanes, setGenerandoPlanes] = useState(false)
  const [planAbierto, setPlanAbierto] = useState(null)

  const cargarPlanes = async () => {
    const response = await api.get('/nutricion/planes/')
    const datos = Array.isArray(response.data) ? response.data : []

    // El plan personalizado (el tuyo) siempre va primero.
    datos.sort((a, b) => (b.generada_por_ia ? 1 : 0) - (a.generada_por_ia ? 1 : 0))

    setPlanes(datos)
    setPlanAbierto((actual) => {
      if (actual && datos.some((plan) => plan.id === actual)) {
        return actual
      }

      return datos[0]?.id ?? null
    })

    return datos
  }

  const cargarRegistros = async () => {
    try {
      setCargandoRegistros(true)
      const response = await api.get('/nutricion/registros/')
      setRegistros(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Error cargando registros de comidas:', err)
      setError(
        err.response?.data?.detail ||
        'No se pudieron cargar las comidas registradas.'
      )
    } finally {
      setCargandoRegistros(false)
    }
  }

  const generarPlanPersonalizado = async () => {
    try {
      const res = await api.post('/nutricion/planes/generar-personalizado/')
      setObjetivo(res.data.objetivo)
    } catch (err) {
      console.error('Error generando el plan personalizado:', err)
    }
  }

  const generarPlanesAutomaticos = async () => {
    try {
      setGenerandoPlanes(true)
      setError('')
      setMensaje('')

      await Promise.all([
        api.post('/nutricion/planes/generar-catalogo/'),
        generarPlanPersonalizado(),
      ])
      await Promise.all([cargarPlanes(), cargarRegistros()])

      setMensaje('Planes alimenticios generados correctamente.')
    } catch (err) {
      console.error('Error generando planes alimenticios:', err)

      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else if (err.response?.status === 404) {
        setError(
          'El generador de planes no está conectado en el backend. Revisa la URL de nutrición y reinicia Django.'
        )
      } else {
        setError('No se pudieron generar los planes alimenticios.')
      }
    } finally {
      setGenerandoPlanes(false)
    }
  }

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setCargando(true)
        setError('')

        await Promise.all([
          api.post('/nutricion/planes/generar-catalogo/'),
          generarPlanPersonalizado(),
        ])
        await Promise.all([cargarPlanes(), cargarRegistros()])
      } catch (err) {
        console.error('Error cargando nutrición:', err)

        if (err.response?.status === 404) {
          setError(
            'No está disponible el generador de planes alimenticios. Revisa el backend y reinicia Django.'
          )
        } else {
          setError(
            err.response?.data?.detail ||
            'No se pudo cargar la información nutricional.'
          )
        }
      } finally {
        setCargando(false)
      }
    }

    cargarTodo()
  }, [])

  const registrarComida = async (comidaId) => {
    try {
      setRegistrandoComida(comidaId)
      setError('')
      setMensaje('')

      await api.post('/nutricion/registros/', { comida: comidaId })
      await cargarRegistros()

      setMensaje('Comida registrada correctamente.')
    } catch (err) {
      console.error('Error registrando comida:', err)

      const data = err.response?.data

      if (data && typeof data === 'object') {
        const mensajes = Object.entries(data)
          .map(([campo, valor]) => {
            const texto = Array.isArray(valor)
              ? valor.join(', ')
              : String(valor)

            return `${campo}: ${texto}`
          })
          .join(' | ')

        setError(mensajes || 'No se pudo registrar la comida.')
      } else {
        setError('No se pudo registrar la comida.')
      }
    } finally {
      setRegistrandoComida(null)
    }
  }

  const totalComidas = useMemo(
    () => planes.reduce(
      (total, plan) => total + (plan.comidas?.length || 0),
      0
    ),
    [planes]
  )

  const caloriasHoy = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    return registros
      .filter((registro) => registro.fecha === hoy)
      .reduce((total, registro) => total + (Number(registro.calorias) || 0), 0)
  }, [registros])

  if (cargando) {
    return (
      <main className="nutricion-page">
        <section className="nutricion-loading">
          <div className="nutricion-spinner" />
          <p>Cargando nutrición...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="nutricion-page">
      <div className="nutricion-container">
        <section className="nutricion-hero">
          <div className="nutricion-hero-copy">
            <span className="nutricion-kicker">BODY RHYTHM</span>
            <h1>Nutrición</h1>
            <p>
              Tu alimentación organizada en un solo lugar.
              Los planes y las comidas se generan desde el catálogo base.
            </p>
          </div>

          <div className="nutricion-hero-badge">
            <span>PLANES</span>
            <strong>{planes.length}</strong>
          </div>
        </section>

        {error && (
          <div className="nutricion-alert nutricion-alert-error">
            <div className="nutricion-alert-mark">!</div>
            <div>
              <strong>No se pudo completar la carga</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {mensaje && (
          <div className="nutricion-alert nutricion-alert-success">
            <div className="nutricion-alert-mark">✓</div>
            <div>
              <strong>Listo</strong>
              <span>{mensaje}</span>
            </div>
          </div>
        )}

        <section className="nutricion-overview-grid">
          <article className="nutricion-card nutricion-catalog-card">
            <div className="nutricion-card-header">
              <div>
                <span className="nutricion-section-label">CATÁLOGO</span>
                <h2>Planes alimenticios</h2>
              </div>

              <button
                type="button"
                className="nutricion-action-button"
                onClick={generarPlanesAutomaticos}
                disabled={generandoPlanes}
              >
                {generandoPlanes ? 'Generando...' : 'Generar planes'}
              </button>
            </div>

            <div className="nutricion-auto-plan">
              <div className="nutricion-auto-plan-icon">✓</div>
              <div className="nutricion-auto-plan-copy">
                <strong>Planes base disponibles</strong>
                <p>
                  Body Rhythm crea los planes alimenticios y sus comidas
                  automáticamente usando los alimentos que ya existen en el
                  catálogo.
                </p>

                <div className="nutricion-summary">
                  <span>{planes.length} planes</span>
                  <span>{totalComidas} comidas</span>
                </div>
              </div>
            </div>
          </article>

          <article className="nutricion-card nutricion-summary-card">
            <span className="nutricion-section-label">RESUMEN</span>
            <h2>Tu alimentación</h2>

            <div className="nutricion-summary-metrics">
              <div>
                <strong>{planes.length}</strong>
                <span>Planes alimenticios</span>
              </div>

              <div>
                <strong>{totalComidas}</strong>
                <span>Comidas disponibles</span>
              </div>

              <div>
                <strong>{registros.length}</strong>
                <span>Comidas registradas</span>
              </div>
            </div>
          </article>

          <article className="nutricion-card nutricion-objetivo-card">
            <span className="nutricion-section-label">OBJETIVO DIARIO</span>
            <h2>Calculado para ti</h2>

            {objetivo ? (
              <>
                <div className="nutricion-macros">
                  <div>
                    <span>Calorías</span>
                    <strong>{formatearNumero(objetivo.calorias)}</strong>
                  </div>
                  <div>
                    <span>Proteínas</span>
                    <strong>{formatearNumero(objetivo.proteinas_g, ' g')}</strong>
                  </div>
                  <div>
                    <span>Carbohidratos</span>
                    <strong>{formatearNumero(objetivo.carbohidratos_g, ' g')}</strong>
                  </div>
                  <div>
                    <span>Grasas</span>
                    <strong>{formatearNumero(objetivo.grasas_g, ' g')}</strong>
                  </div>
                </div>

                {!objetivo.datos_completos && (
                  <p className="nutricion-objetivo-aviso">
                    Completa tu peso, altura, fecha de nacimiento, género y
                    objetivo en tu perfil para afinar este cálculo.
                  </p>
                )}
              </>
            ) : (
              <p>Calculando tu objetivo según tu perfil...</p>
            )}
          </article>
        </section>

        <section className="nutricion-card nutricion-plans-card">
          <div className="nutricion-list-header">
            <div>
              <span className="nutricion-section-label">PLAN ALIMENTICIO</span>
              <h2>Tus planes alimenticios</h2>
              <p>Abre un plan para ver sus comidas y registrarlas.</p>
            </div>

            <button
              type="button"
              className="nutricion-refresh-button"
              onClick={async () => {
                try {
                  setError('')
                  await Promise.all([cargarPlanes(), cargarRegistros()])
                } catch (err) {
                  console.error('Error actualizando nutrición:', err)
                  setError(
                    'No se pudo actualizar la información nutricional.'
                  )
                }
              }}
            >
              Actualizar
            </button>
          </div>

          {planes.length === 0 ? (
            <div className="nutricion-empty">
              <div className="nutricion-empty-icon">+</div>
              <h3>Aún no hay planes disponibles</h3>
              <p>Pulsa “Generar planes” para crear el catálogo base.</p>
            </div>
          ) : (
            <div className="nutricion-plan-list">
              {planes.map((plan, index) => {
                const abierto = planAbierto === plan.id
                const comidas = Array.isArray(plan.comidas) ? plan.comidas : []

                return (
                  <article
                    className={`nutricion-plan-card ${
                      abierto ? 'nutricion-plan-card-open' : ''
                    } ${
                      plan.generada_por_ia ? 'nutricion-plan-card-personalizado' : ''
                    }`}
                    key={plan.id}
                  >
                    <button
                      type="button"
                      className="nutricion-plan-toggle"
                      onClick={() => setPlanAbierto(abierto ? null : plan.id)}
                    >
                      <div className="nutricion-plan-top">
                        <div>
                          <span className="nutricion-plan-number">
                            PLAN {String(index + 1).padStart(2, '0')}
                          </span>
                          <h3>{plan.nombre}</h3>

                          <div className="nutricion-badge-row">
                            {plan.generada_por_ia && (
                              <span className="nutricion-badge nutricion-badge-personalizado">
                                Hecho para ti
                              </span>
                            )}
                            {plan.recomendado && (
                              <span className="nutricion-badge nutricion-badge-recomendado">
                                Recomendado para tu objetivo
                              </span>
                            )}
                          </div>

                          {plan.descripcion && (
                            <p>{plan.descripcion}</p>
                          )}
                        </div>

                        <span
                          className={`nutricion-plan-chevron ${
                            abierto ? 'nutricion-plan-chevron-open' : ''
                          }`}
                        >
                          ⌄
                        </span>
                      </div>

                      <div className="nutricion-macros">
                        <div>
                          <span>Calorías</span>
                          <strong>{formatearNumero(plan.calorias_diarias)}</strong>
                        </div>
                        <div>
                          <span>Proteínas</span>
                          <strong>{formatearNumero(plan.proteinas_g, ' g')}</strong>
                        </div>
                        <div>
                          <span>Carbohidratos</span>
                          <strong>{formatearNumero(plan.carbohidratos_g, ' g')}</strong>
                        </div>
                        <div>
                          <span>Grasas</span>
                          <strong>{formatearNumero(plan.grasas_g, ' g')}</strong>
                        </div>
                      </div>
                    </button>

                    {abierto && (
                      <div className="nutricion-plan-content">
                        <div className="nutricion-meals-title">
                          <div>
                            <span>COMIDAS DEL PLAN</span>
                            <strong>{comidas.length}</strong>
                          </div>
                        </div>

                        {comidas.length > 0 ? (
                          <div className="nutricion-meal-list">
                            {comidas.map((comida) => (
                              <div className="nutricion-meal" key={comida.id}>
                                <div className="nutricion-meal-main">
                                  <span>{formatearTipo(comida.tipo)}</span>
                                  <strong>{comida.nombre}</strong>

                                  {comida.descripcion && (
                                    <small>{comida.descripcion}</small>
                                  )}
                                </div>

                                <div className="nutricion-meal-actions">
                                  <div className="nutricion-meal-kcal">
                                    {formatearNumero(comida.calorias, ' kcal')}
                                  </div>

                                  <button
                                    type="button"
                                    className="nutricion-register-button"
                                    onClick={() => registrarComida(comida.id)}
                                    disabled={registrandoComida === comida.id}
                                  >
                                    {registrandoComida === comida.id
                                      ? 'Registrando...'
                                      : 'Registrar'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="nutricion-no-meals">
                            <strong>Este plan todavía no tiene comidas.</strong>
                            <span>
                              Genera nuevamente el catálogo para completarlo.
                            </span>
                            <button
                              type="button"
                              className="nutricion-inline-button"
                              onClick={generarPlanesAutomaticos}
                              disabled={generandoPlanes}
                            >
                              {generandoPlanes
                                ? 'Generando...'
                                : 'Completar comidas'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="nutricion-card nutricion-registros-card">
          <div className="nutricion-list-header">
            <div>
              <span className="nutricion-section-label">HISTORIAL</span>
              <h2>Comidas registradas</h2>
              <p>
                Aquí aparecen las comidas que hayas marcado como registradas.
              </p>
            </div>

            <button
              type="button"
              className="nutricion-refresh-button"
              onClick={cargarRegistros}
              disabled={cargandoRegistros}
            >
              {cargandoRegistros ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {registros.length > 0 && (
            <div className="nutricion-hoy-resumen">
              <span>Calorías registradas hoy:</span>
              <strong>{formatearNumero(caloriasHoy, ' kcal')}</strong>
              {objetivo && (
                <span>de {formatearNumero(objetivo.calorias, ' kcal')} objetivo</span>
              )}
            </div>
          )}

          {registros.length === 0 ? (
            <div className="nutricion-empty nutricion-empty-small">
              <div className="nutricion-empty-icon">✓</div>
              <h3>Aún no has registrado comidas</h3>
              <p>
                Abre un plan y pulsa “Registrar” en la comida que quieras guardar.
              </p>
            </div>
          ) : (
            <div className="nutricion-registros-list">
              {registros.map((registro) => (
                <div className="nutricion-registro" key={registro.id}>
                  <div className="nutricion-registro-icon">✓</div>
                  <div>
                    <span>Comida registrada</span>
                    <strong>{registro.comida_nombre || 'Comida'}</strong>
                  </div>
                  <time>{registro.fecha || 'Fecha no disponible'}</time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
