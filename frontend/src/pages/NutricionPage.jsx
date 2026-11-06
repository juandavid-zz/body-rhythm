
import { useEffect, useMemo, useState } from 'react'
import api from '../api/api'
import Navbar from '../components/Navbar'
import NutricionVisual from '../components/NutricionVisual'
import '../css/nutricion.css'

const modalidadesPrincipales = [
  'Plan equilibrado',
  'Plan alto en proteína',
  'Plan energía y entrenamiento',
  'Plan balance ligero',
  'Plan mantenimiento',
]

const modalidadesAlternativas = [
  'Plan pérdida de peso',
  'Plan ganancia muscular',
  'Plan vegetariano',
  'Plan rendimiento deportivo',
  'Plan alto en fibra',
]

const normalizarNombre = (nombre = '') =>
  String(nombre).trim().toLowerCase()

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
  if (valor === null || valor === undefined || valor === '') {
    return '—'
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return '—'

  return `${Number.isInteger(numero) ? numero : numero.toFixed(1)}${sufijo}`
}

// Primero tu plan personalizado, luego el recomendado para tu meta y después los demás
const pesoPlan = (plan) => (plan.generada_por_ia ? 2 : plan.recomendado ? 1 : 0)
const ordenPlanes = (a, b) => pesoPlan(b) - pesoPlan(a)

const obtenerFechaLocal = (fecha = new Date()) => {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

export default function NutricionPage() {
  const [planes, setPlanes] = useState([])
  const [registros, setRegistros] = useState([])
  const [objetivo, setObjetivo] = useState(null)
  const [cantidades, setCantidades] = useState({})

  const [cargando, setCargando] = useState(true)
  const [cargandoRegistros, setCargandoRegistros] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [registrandoComida, setRegistrandoComida] = useState(null)
  const [generandoModalidad, setGenerandoModalidad] = useState(false)
  const [generandoPersonalizado, setGenerandoPersonalizado] = useState(false)
  const [generandoPlanes, setGenerandoPlanes] = useState(false)
  const [eliminandoPlan, setEliminandoPlan] = useState(null)
  const [eliminandoRegistro, setEliminandoRegistro] = useState(null)

  const [confirmacionEliminacion, setConfirmacionEliminacion] = useState(null)

  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('')
  const [modalidadConsultada, setModalidadConsultada] = useState('')

  const [planAbierto, setPlanAbierto] = useState(null)

  // ==========================================
  // CARGAR PLANES
  // ==========================================

  const cargarPlanes = async () => {
    const response = await api.get('/nutricion/planes/')

    const datos = Array.isArray(response.data)
      ? response.data
      : []

    datos.sort(ordenPlanes)

    setPlanes(datos)

    setPlanAbierto((actual) => {
      if (actual && datos.some((plan) => plan.id === actual)) {
        return actual
      }

      return datos[0]?.id ?? null
    })

    return datos
  }

  // ==========================================
  // CARGAR REGISTROS
  // ==========================================

  const cargarRegistros = async () => {
    try {
      setCargandoRegistros(true)

      const response = await api.get('/nutricion/registros/')

      setRegistros(
        Array.isArray(response.data)
          ? response.data
          : []
      )
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

  // ==========================================
  // GENERAR PLAN PERSONALIZADO
  // ==========================================

  const generarPlanPersonalizado = async () => {
    const response = await api.post(
      '/nutricion/planes/generar-personalizado/'
    )

    if (response.data?.objetivo) {
      setObjetivo(response.data.objetivo)
    }

    return response.data?.plan ?? null
  }

  const generarMiPlan = async () => {
    try {
      setGenerandoPersonalizado(true)
      setError('')
      setMensaje('')

      const plan = await generarPlanPersonalizado()

      const datosActualizados = await cargarPlanes()
      await cargarRegistros()

      const planEncontrado =
        datosActualizados.find(
          (item) =>
            plan?.id && item.id === plan.id
        ) ||
        datosActualizados.find(
          (item) =>
            item.generada_por_ia ||
            normalizarNombre(item.nombre).includes('personalizado')
        )

      if (planEncontrado?.id) {
        setPlanAbierto(planEncontrado.id)

        setTimeout(() => {
          document
            .getElementById(`plan-nutricional-${planEncontrado.id}`)
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
        }, 100)
      }

      setMensaje('Tu plan personalizado está actualizado.')
    } catch (err) {
      console.error('Error generando plan personalizado:', err)

      setError(
        err.response?.data?.detail ||
        'No se pudo generar tu plan personalizado. Revisa los datos de tu perfil.'
      )
    } finally {
      setGenerandoPersonalizado(false)
    }
  }

  // ==========================================
  // VER MI PLAN PERSONALIZADO
  // ==========================================

  const verMiPlan = () => {
    if (!planPersonalizado?.id) {
      setError('Todavía no tienes un plan personalizado.')
      return
    }

    setError('')
    setPlanAbierto(planPersonalizado.id)

    setTimeout(() => {
      document
        .getElementById(`plan-nutricional-${planPersonalizado.id}`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
    }, 100)
  }

  // ==========================================
  // SOLICITAR CONFIRMACIÓN DE ELIMINACIÓN
  // ==========================================

  const solicitarEliminarPlan = (plan) => {
    setError('')
    setMensaje('')

    setConfirmacionEliminacion({
      tipo: 'plan',
      id: plan.id,
      nombre: plan.nombre,
    })
  }

  const solicitarEliminarRegistro = (registro) => {
    setError('')
    setMensaje('')

    setConfirmacionEliminacion({
      tipo: 'registro',
      id: registro.id,
      nombre: registro.comida_nombre || 'esta comida',
    })
  }

  const cancelarEliminacion = () => {
    if (eliminandoPlan !== null || eliminandoRegistro !== null) {
      return
    }

    setConfirmacionEliminacion(null)
  }

  // ==========================================
  // CONFIRMAR ELIMINACIÓN
  // ==========================================

  const confirmarEliminacion = async () => {
    if (!confirmacionEliminacion) return

    const { tipo, id, nombre } = confirmacionEliminacion

    setError('')
    setMensaje('')

    try {
      if (tipo === 'plan') {
        setEliminandoPlan(id)

        await api.delete(`/nutricion/planes/${id}/`)

        const datosActualizados = await cargarPlanes()

        setPlanAbierto((actual) => {
          if (actual === id) {
            return datosActualizados[0]?.id ?? null
          }

          return actual
        })

        setMensaje(
          `El plan "${nombre}" se eliminó correctamente. Tu historial de comidas se conservó.`
        )
      }

      if (tipo === 'registro') {
        setEliminandoRegistro(id)

        await api.delete(`/nutricion/registros/${id}/`)

        setRegistros((actuales) =>
          actuales.filter((registro) => registro.id !== id)
        )

        setMensaje(
          `La comida "${nombre}" se eliminó correctamente de tu historial.`
        )
      }

      setConfirmacionEliminacion(null)
    } catch (err) {
      console.error('Error eliminando elemento:', err)

      setError(
        err.response?.data?.detail ||
        (
          tipo === 'plan'
            ? 'No se pudo eliminar el plan. Inténtalo nuevamente.'
            : 'No se pudo eliminar la comida del historial. Inténtalo nuevamente.'
        )
      )

      setConfirmacionEliminacion(null)
    } finally {
      setEliminandoPlan(null)
      setEliminandoRegistro(null)
    }
  }

  // ==========================================
  // GENERAR O CONSULTAR OTRA MODALIDAD
  // ==========================================

  const generarModalidad = async () => {
    if (!modalidadSeleccionada) {
      setError('Selecciona primero una modalidad.')
      return
    }

    try {
      setGenerandoModalidad(true)
      setError('')
      setMensaje('')

      const response = await api.post(
        '/nutricion/planes/generar-modalidad/',
        {
          nombre: modalidadSeleccionada,
        }
      )

      const planGenerado = response.data

      setModalidadConsultada(modalidadSeleccionada)

      const datosActualizados = await cargarPlanes()
      await cargarRegistros()

      const planEncontrado =
        datosActualizados.find(
          (plan) =>
            planGenerado?.id &&
            plan.id === planGenerado.id
        ) ||
        datosActualizados.find(
          (plan) =>
            normalizarNombre(plan.nombre) ===
            normalizarNombre(modalidadSeleccionada)
        )

      if (planEncontrado?.id) {
        setPlanAbierto(planEncontrado.id)

        setTimeout(() => {
          document
            .getElementById(`plan-nutricional-${planEncontrado.id}`)
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
        }, 100)
      }

      setMensaje(
        `${modalidadSeleccionada} está disponible correctamente.`
      )
    } catch (err) {
      console.error('Error generando modalidad:', err)

      setError(
        err.response?.data?.detail ||
        'No se pudo generar esta modalidad. Revisa el backend.'
      )
    } finally {
      setGenerandoModalidad(false)
    }
  }

  // ==========================================
// RECUPERAR PLANES PRINCIPALES
// ==========================================

const restaurarPlanes = async () => {
  try {
    setGenerandoPlanes(true)
    setError('')
    setMensaje('')

    await api.post('/nutricion/planes/generar-catalogo/')

    await cargarPlanes()

    setMensaje(
      'Los planes principales están disponibles nuevamente. Los planes que ya existían se conservaron.'
    )
  } catch (err) {
    console.error('Error recuperando planes:', err)

    setError(
      err.response?.data?.detail ||
      'No se pudieron recuperar los planes principales.'
    )
  } finally {
    setGenerandoPlanes(false)
  }
}
  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setCargando(true)
        setError('')

        const [
          respuestaPlanes,
          respuestaRegistros,
          respuestaObjetivo,
        ] = await Promise.all([
          api.get('/nutricion/planes/'),
          api.get('/nutricion/registros/'),
          api.get('/nutricion/objetivo/'),
        ])

        const datosPlanes = Array.isArray(respuestaPlanes.data)
          ? respuestaPlanes.data
          : []

        datosPlanes.sort(ordenPlanes)

        setPlanes(datosPlanes)

        setRegistros(
          Array.isArray(respuestaRegistros.data)
            ? respuestaRegistros.data
            : []
        )

        setObjetivo(
          respuestaObjetivo.data?.objetivo ??
          respuestaObjetivo.data ??
          null
        )

        setPlanAbierto(datosPlanes[0]?.id ?? null)
      } catch (err) {
        console.error('Error cargando nutrición:', err)

        setError(
          err.response?.data?.detail ||
          'No se pudo cargar la información nutricional.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarTodo()
  }, [])

  // ==========================================
  // PLANES QUE SE MOSTRARÁN EN PANTALLA
  // ==========================================

  const planesPrincipales = useMemo(() => {
    return planes.filter((plan) =>
      modalidadesPrincipales.some(
        (nombre) =>
          normalizarNombre(nombre) ===
          normalizarNombre(plan.nombre)
      )
    )
  }, [planes])

  const planesAlternativosConsultados = useMemo(() => {
    if (!modalidadConsultada) return []

    return planes.filter(
      (plan) =>
        normalizarNombre(plan.nombre) ===
        normalizarNombre(modalidadConsultada)
    )
  }, [planes, modalidadConsultada])

  // Sin useMemo: el compilador de React ya lo memoriza solo
  const planPersonalizado =
    planes.find(
      (plan) =>
        plan.generada_por_ia ||
        normalizarNombre(plan.nombre).includes('personalizado')
    ) ?? null

  const planesParaMostrar = useMemo(() => {
    const resultado = [...planesPrincipales]

    planesAlternativosConsultados.forEach((alternativo) => {
      const yaExiste = resultado.some(
        (plan) => plan.id === alternativo.id
      )

      if (!yaExiste) {
        resultado.push(alternativo)
      }
    })

    if (planPersonalizado) {
      const yaExiste = resultado.some(
        (plan) => plan.id === planPersonalizado.id
      )

      // Tu plan personalizado va de primero
      if (!yaExiste) {
        resultado.unshift(planPersonalizado)
      }
    }

    return resultado
  }, [
    planesPrincipales,
    planesAlternativosConsultados,
    planPersonalizado,
  ])

  // ==========================================
  // REGISTRAR COMIDA
  // ==========================================

  const registrarComida = async (comida) => {
    const cantidad = Number(
      cantidades[comida.id] ??
      comida.cantidad_base_g ??
      100
    )

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      cantidad > 10000
    ) {
      setError(
        'Ingresa una cantidad válida entre 1 y 10000 gramos.'
      )
      return
    }

    try {
      setRegistrandoComida(comida.id)
      setError('')
      setMensaje('')

      await api.post('/nutricion/registros/', {
        comida: comida.id,
        cantidad_g: cantidad,
      })

      await cargarRegistros()

      setMensaje(
        `${comida.nombre} registrada correctamente: ${cantidad} g.`
      )
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

  // ==========================================
  // RESÚMENES
  // ==========================================

  const totalComidas = useMemo(
    () =>
      planesParaMostrar.reduce(
        (total, plan) =>
          total + (plan.comidas?.length || 0),
        0
      ),
    [planesParaMostrar]
  )

const caloriasHoy = useMemo(() => {
  const hoy = obtenerFechaLocal()

  return registros
    .filter((registro) => {
      if (!registro.fecha) return false

      const valorFecha = String(registro.fecha)

      // Si viene solamente la fecha, evitar conversión UTC.
      if (/^\d{4}-\d{2}-\d{2}$/.test(valorFecha)) {
        return valorFecha === hoy
      }

      // Si viene fecha y hora, convertir a fecha local.
      const fechaRegistro = new Date(valorFecha)

      if (Number.isNaN(fechaRegistro.getTime())) {
        return valorFecha.slice(0, 10) === hoy
      }

      return obtenerFechaLocal(fechaRegistro) === hoy
    })
    .reduce((total, registro) => {
      return total + (Number(registro.calorias) || 0)
    }, 0)
}, [registros])

  // ==========================================
  // ACTUALIZAR INFORMACIÓN
  // ==========================================

  const actualizarNutricion = async () => {
    try {
      setError('')

      await Promise.all([
        cargarPlanes(),
        cargarRegistros(),
      ])
    } catch (err) {
      console.error('Error actualizando nutrición:', err)

      setError(
        'No se pudo actualizar la información nutricional.'
      )
    }
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <>
        <Navbar />

        <main className="nutricion-page">
          <section className="nutricion-loading">
            <div className="nutricion-spinner" />
            <p>Cargando nutrición...</p>
          </section>
        </main>
      </>
    )
  }

  // ==========================================
  // PANTALLA PRINCIPAL
  // ==========================================

  return (
    <>
      <Navbar />

      <main className="nutricion-page">
        <div className="nutricion-container">

          {/* CABECERA */}

          <section className="nutricion-hero">
            <div className="nutricion-hero-copy">
              <span className="nutricion-kicker">
                BODY RHYTHM
              </span>

              <h1>Nutrición</h1>

              <p>
                Tu alimentación organizada en un solo lugar.
                Consulta tus planes y encuentra una modalidad
                adecuada para tus objetivos.
              </p>
            </div>

            <div className="nutricion-hero-badge">
              <span>PLANES</span>
              <strong>{planesParaMostrar.length}</strong>
            </div>
          </section>

          {/* MENSAJES */}

          {error && (
            <div className="nutricion-alert nutricion-alert-error">
              <div className="nutricion-alert-mark">!</div>

              <div>
                <strong>No se pudo completar la operación</strong>
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

              <button
                type="button"
                className="nutricion-alert-close"
                onClick={() => setMensaje('')}
                aria-label="Cerrar mensaje"
              >
                ×
              </button>
            </div>
          )}

          {/* VISUALIZACIÓN NUTRICIONAL */}

          <NutricionVisual
            caloriasHoy={caloriasHoy}
            objetivo={objetivo}
            registros={registros}
          />

          {/* SECCIONES PRINCIPALES */}

          <section className="nutricion-overview-grid">

            {/* PLANES PRINCIPALES */}

            <article className="nutricion-card nutricion-catalog-card">
              <span className="nutricion-section-label">
                PLANES DISPONIBLES
              </span>

              <h2>Explora tu alimentación</h2>

              <p>
                Consulta cinco propuestas de alimentación.
                También puedes explorar otras modalidades o
                generar un plan personalizado según tu perfil.
              </p>

              <div className="nutricion-summary">
                <span>{modalidadesPrincipales.length} planes principales</span>
                <span>{planesPrincipales.length} disponibles</span>
              </div>

              <button
  type="button"
  className="nutricion-action-button"
  onClick={restaurarPlanes}
  disabled={generandoPlanes}
>
  {generandoPlanes
    ? 'Recuperando planes...'
    : '+ Volver a agregar planes principales'}
</button>
            </article>

            {/* PLANES DIFERENTES */}

            <article className="nutricion-card nutricion-modalidad-card">
              <span className="nutricion-section-label">
                PLANES DIFERENTES
              </span>

              <h2>Elige otra modalidad</h2>

              <p>
                Explora otras propuestas de alimentación
                y consulta la que mejor se adapte a tus preferencias.
              </p>

              <label className="nutricion-cantidad-label">
                Modalidad

                <select
                  value={modalidadSeleccionada}
                  onChange={(e) =>
                    setModalidadSeleccionada(e.target.value)
                  }
                  disabled={generandoModalidad}
                >
                  <option value="">
                    Selecciona una modalidad
                  </option>

                  {modalidadesAlternativas.map((modalidad) => (
                    <option key={modalidad} value={modalidad}>
                      {modalidad}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="nutricion-action-button"
                onClick={generarModalidad}
                disabled={
                  generandoModalidad ||
                  !modalidadSeleccionada
                }
              >
                {generandoModalidad
                  ? 'Generando...'
                  : 'Generar modalidad'}
              </button>
            </article>

            {/* MI PLAN PERSONALIZADO */}

            <article className="nutricion-card nutricion-objetivo-card">
              <span className="nutricion-section-label">
                MI PLAN PERSONALIZADO
              </span>

              <h2>Un plan según tu perfil</h2>

              <p>
                Calcula tus objetivos nutricionales a partir
                de la información y las metas registradas en tu perfil.
              </p>

              {objetivo && (
                <div className="nutricion-macros">
                  <div>
                    <span>Calorías</span>
                    <strong>
                      {formatearNumero(objetivo.calorias)}
                    </strong>
                  </div>

                  <div>
                    <span>Proteínas</span>
                    <strong>
                      {formatearNumero(objetivo.proteinas_g, ' g')}
                    </strong>
                  </div>

                  <div>
                    <span>Carbohidratos</span>
                    <strong>
                      {formatearNumero(objetivo.carbohidratos_g, ' g')}
                    </strong>
                  </div>

                  <div>
                    <span>Grasas</span>
                    <strong>
                      {formatearNumero(objetivo.grasas_g, ' g')}
                    </strong>
                  </div>
                </div>
              )}

              {objetivo && !objetivo.datos_completos && (
                <p className="nutricion-objetivo-aviso">
                  Completa tu peso, altura, fecha de nacimiento,
                  género y objetivo en tu perfil para mejorar el cálculo.
                </p>
              )}

              {planPersonalizado && (
                <div className="nutricion-personalizado-disponible">
                  <span>
                    ✓ Tu plan personalizado ya está disponible
                  </span>

                  <button
                    type="button"
                    className="nutricion-refresh-button"
                    onClick={verMiPlan}
                  >
                    Ver mi plan
                  </button>
                </div>
              )}

              <button
                type="button"
                className="nutricion-action-button"
                onClick={generarMiPlan}
                disabled={generandoPersonalizado}
              >
                {generandoPersonalizado
                  ? 'Generando...'
                  : planPersonalizado
                    ? 'Actualizar mi plan personalizado'
                    : 'Generar mi plan personalizado'}
              </button>
            </article>

            {/* RESUMEN */}

            <article className="nutricion-card nutricion-summary-card">
              <span className="nutricion-section-label">
                RESUMEN
              </span>

              <h2>Tu alimentación</h2>

              <div className="nutricion-summary-metrics">
                <div>
                  <strong>{planesParaMostrar.length}</strong>
                  <span>Planes visibles</span>
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

          </section>

          {/* LISTA DE PLANES */}

          <section className="nutricion-card nutricion-plans-card">
            <div className="nutricion-list-header">
              <div>
                <span className="nutricion-section-label">
                  PLAN ALIMENTICIO
                </span>

                <h2>Tus planes alimenticios</h2>

                <p>
                  Abre un plan para ver sus comidas y registrarlas.
                </p>
              </div>

              <button
                type="button"
                className="nutricion-refresh-button"
                onClick={actualizarNutricion}
              >
                Actualizar
              </button>
            </div>

            {planesParaMostrar.length === 0 ? (
              <div className="nutricion-empty">
                <div className="nutricion-empty-icon">+</div>

                <h3>Aún no hay planes disponibles</h3>

                <p>
                  Utiliza el selector de planes diferentes
                  o genera tu plan personalizado.
                </p>
              </div>
            ) : (
              <div className="nutricion-plan-list">
                {planesParaMostrar.map((plan, index) => {
                  const abierto = planAbierto === plan.id

                  const comidas = Array.isArray(plan.comidas)
                    ? plan.comidas
                    : []

                  const esPersonalizado =
                    plan.generada_por_ia ||
                    normalizarNombre(plan.nombre).includes('personalizado')

                  return (
                    <article
                      id={`plan-nutricional-${plan.id}`}
                      className={`nutricion-plan-card ${
                        abierto ? 'nutricion-plan-card-open' : ''
                      } ${
                        esPersonalizado
                          ? 'nutricion-plan-card-personalizado'
                          : ''
                      }`}
                      key={plan.id}
                    >
                      <button
                        type="button"
                        className="nutricion-plan-toggle"
                        onClick={() =>
                          setPlanAbierto(abierto ? null : plan.id)
                        }
                      >
                        <div className="nutricion-plan-top">
                          <div>
                            <span className="nutricion-plan-number">
                              PLAN {String(index + 1).padStart(2, '0')}
                            </span>

                            <h3>{plan.nombre}</h3>

                            <div className="nutricion-badge-row">
                              {esPersonalizado && (
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
                              abierto
                                ? 'nutricion-plan-chevron-open'
                                : ''
                            }`}
                          >
                            ⌄
                          </span>
                        </div>

                        <div className="nutricion-macros">
                          <div>
                            <span>Calorías</span>
                            <strong>
                              {formatearNumero(plan.calorias_diarias)}
                            </strong>
                          </div>

                          <div>
                            <span>Proteínas</span>
                            <strong>
                              {formatearNumero(plan.proteinas_g, ' g')}
                            </strong>
                          </div>

                          <div>
                            <span>Carbohidratos</span>
                            <strong>
                              {formatearNumero(plan.carbohidratos_g, ' g')}
                            </strong>
                          </div>

                          <div>
                            <span>Grasas</span>
                            <strong>
                              {formatearNumero(plan.grasas_g, ' g')}
                            </strong>
                          </div>
                        </div>
                      </button>

                      {/* BOTÓN ELIMINAR PLAN */}

                      <div className="nutricion-plan-actions">
                        <button
                          type="button"
                          className="nutricion-delete-button"
                          onClick={() => solicitarEliminarPlan(plan)}
                          disabled={eliminandoPlan === plan.id}
                        >
                          {eliminandoPlan === plan.id
                            ? 'Eliminando...'
                            : 'Eliminar plan'}
                        </button>
                      </div>

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
                                <div
                                  className="nutricion-meal"
                                  key={comida.id}
                                >
                                  <div className="nutricion-meal-main">
                                    <span>
                                      {formatearTipo(comida.tipo)}
                                    </span>

                                    <strong>{comida.nombre}</strong>

                                    {comida.descripcion && (
                                      <small>
                                        {comida.descripcion}
                                      </small>
                                    )}
                                  </div>

                                  <div className="nutricion-meal-actions">
                                    <div className="nutricion-meal-kcal">
                                      {formatearNumero(
                                        comida.calorias,
                                        ' kcal'
                                      )}
                                    </div>

                                    <label className="nutricion-cantidad-label">
                                      Cantidad (g)

                                      <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        step="1"
                                        value={
                                          cantidades[comida.id] ??
                                          comida.cantidad_base_g ??
                                          100
                                        }
                                        onChange={(e) =>
                                          setCantidades((actual) => ({
                                            ...actual,
                                            [comida.id]: e.target.value,
                                          }))
                                        }
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      className="nutricion-register-button"
                                      onClick={() =>
                                        registrarComida(comida)
                                      }
                                      disabled={
                                        registrandoComida === comida.id
                                      }
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
                              <strong>
                                Este plan todavía no tiene comidas.
                              </strong>

                              <span>
                                Puedes actualizar la página o revisar
                                el catálogo de alimentos.
                              </span>
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

          {/* HISTORIAL */}

          <section className="nutricion-card nutricion-registros-card">
            <div className="nutricion-list-header">
              <div>
                <span className="nutricion-section-label">
                  HISTORIAL
                </span>

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
                {cargandoRegistros
                  ? 'Cargando...'
                  : 'Actualizar'}
              </button>
            </div>

            {registros.length > 0 && (
              <div className="nutricion-hoy-resumen">
                <span>Calorías registradas hoy:</span>

                <strong>
                  {formatearNumero(caloriasHoy, ' kcal')}
                </strong>

                {objetivo && (
                  <span>
                    de {formatearNumero(objetivo.calorias, ' kcal')} objetivo
                  </span>
                )}

                {objetivo && Number(objetivo.calorias) > 0 && (
                  <div
                    className="nutricion-progreso"
                    aria-hidden="true"
                  >
                    <div
                      className="nutricion-progreso-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (caloriasHoy / Number(objetivo.calorias)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {registros.length === 0 ? (
              <div className="nutricion-empty nutricion-empty-small">
                <div className="nutricion-empty-icon">✓</div>

                <h3>Aún no has registrado comidas</h3>

                <p>
                  Abre un plan y pulsa “Registrar” en la comida
                  que quieras guardar.
                </p>
              </div>
            ) : (
              <div className="nutricion-registros-list">
                {registros.map((registro) => (
                  <div
                    className="nutricion-registro"
                    key={registro.id}
                  >
                    <div className="nutricion-registro-icon">✓</div>

                    <div className="nutricion-registro-info">
                      <span>Comida registrada</span>

                      <strong>
                        {registro.comida_nombre || 'Comida'}
                      </strong>

                      <small>
                        Cantidad:{' '}
                        {formatearNumero(registro.cantidad_g, ' g')}
                      </small>

                      <div className="nutricion-registro-macros">
                        <span>
                          {formatearNumero(registro.calorias, ' kcal')}
                        </span>

                        <span>
                          P: {formatearNumero(registro.proteinas_g, ' g')}
                        </span>

                        <span>
                          C: {formatearNumero(registro.carbohidratos_g, ' g')}
                        </span>

                        <span>
                          G: {formatearNumero(registro.grasas_g, ' g')}
                        </span>
                      </div>
                    </div>

                    <div className="nutricion-registro-actions">
                      <time>
                        {registro.fecha || 'Fecha no disponible'}
                      </time>

                      <button
                        type="button"
                        className="nutricion-delete-button nutricion-registro-delete"
                        onClick={() => solicitarEliminarRegistro(registro)}
                        disabled={eliminandoRegistro === registro.id}
                      >
                        {eliminandoRegistro === registro.id
                          ? 'Eliminando...'
                          : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>

      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN */}

      {confirmacionEliminacion && (
        <div
          className="nutricion-modal-overlay"
          role="presentation"
        >
          <section
            className="nutricion-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nutricion-confirm-title"
          >
            <div className="nutricion-confirm-icon">
              <span>!</span>
            </div>

            <span className="nutricion-confirm-kicker">
              BODY RHYTHM
            </span>

            <h2 id="nutricion-confirm-title">
              {confirmacionEliminacion.tipo === 'plan'
                ? '¿Eliminar este plan?'
                : '¿Eliminar esta comida?'}
            </h2>

            <p>
              ¿Estás seguro de que deseas eliminar{' '}
              <strong>
                "{confirmacionEliminacion.nombre}"
              </strong>
              ?
            </p>

            <p className="nutricion-confirm-detail">
              {confirmacionEliminacion.tipo === 'plan'
                ? 'Esta acción no se puede deshacer. Tu historial de comidas registradas se conservará.'
                : 'Esta acción eliminará únicamente este registro de tu historial. No afectará tus otros registros ni tus planes.'}
            </p>

            <div className="nutricion-confirm-actions">
              <button
                type="button"
                className="nutricion-confirm-cancel"
                onClick={cancelarEliminacion}
                disabled={
                  eliminandoPlan !== null ||
                  eliminandoRegistro !== null
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="nutricion-confirm-delete"
                onClick={confirmarEliminacion}
                disabled={
                  eliminandoPlan !== null ||
                  eliminandoRegistro !== null
                }
              >
                {eliminandoPlan !== null ||
                eliminandoRegistro !== null
                  ? 'Eliminando...'
                  : 'Sí, eliminar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
