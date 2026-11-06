import { useState, useRef, useEffect } from 'react'
import { jsonParcial } from '../utils/jsonParcial'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../api/api'
import Navbar from '../components/Navbar'
import '../css/chatbot.css'

// ── Efecto de escritura progresiva (estilo ChatGPT) ──
function useTypewriter(text, { enabled = true, speed = 16, chunk = 2, onTick } = {}) {
  // Guarda cuántos caracteres se han mostrado del texto actual
  const [progreso, setProgreso] = useState({ text: null, i: 0 })
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  })

  useEffect(() => {
    if (!enabled || !text) return
    let i = 0
    const id = setInterval(() => {
      i += chunk
      setProgreso({ text, i })
      onTickRef.current?.()
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, enabled, speed, chunk])

  if (!enabled || !text) return { mostrado: text || '', terminado: true }
  const i = progreso.text === text ? progreso.i : 0
  return { mostrado: text.slice(0, i), terminado: i >= text.length }
}

function TextoAnimado({ text, enabled, onTick }) {
  const { mostrado, terminado } = useTypewriter(text, { enabled, onTick })
  return (
    <>
      {mostrado}
      {!terminado && <span className="cursor-escritura">▍</span>}
    </>
  )
}

function MarkdownAnimado({ text, enabled, onTick }) {
  const { mostrado, terminado } = useTypewriter(text, {
    enabled,
    speed: 12,
    chunk: 3,
    onTick,
  })
  return (
    <div className="markdown-bubble">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{mostrado}</ReactMarkdown>
      {!terminado && <span className="cursor-escritura">▍</span>}
    </div>
  )
}


const PASOS = {
  LUGAR: 'lugar',
  EQUIPO: 'equipo',
  GRUPO_MUSCULAR: 'grupo_muscular',
  CARGANDO: 'cargando',
  RESULTADO: 'resultado',
  ERROR: 'error',
  LIBRE: 'libre', // conversación de preguntas, empezada desde la bienvenida
}

// Íconos de línea (estilo SF Symbols) para la bienvenida
const ICONOS = {
  rutina: (
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  ),
  series: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  ),
  comida: (
    <path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5M7 8h4M17 3c-1.7 1.2-2.5 3.2-2.5 6 0 1.4.9 2.5 2.5 2.5V21" />
  ),
  calentar: (
    <path d="M12 3c.5 3-2.5 4.5-2.5 8a2.5 2.5 0 0 0 5 0c0-1-.5-2-1-2.5 2 .5 4 3 4 5.5a5.5 5.5 0 0 1-11 0C6.5 9 11 7 12 3Z" />
  ),
  enviar: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />,
  casa: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  edificio: <path d="M5 20V5h9v15M14 9h5v11M3 20h18M8 8h3M8 12h3M8 16h3" />,
  persona: (
    <>
      <circle cx="12" cy="5.5" r="2.2" />
      <path d="M12 8.5v6M7.5 11l4.5-2 4.5 2M9 21l3-6.5 3 6.5" />
    </>
  ),
  maquina: <path d="M5 21V4M5 6h9l3 3v12M9 10h5M9 14h5M3 21h16" />,
  superior: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M4.5 10.5 12 8.5l7.5 2M12 8.5V15M8 21l1-6h6l1 6" />
    </>
  ),
  inferior: <path d="M8 4h8l1 6H7l1-6ZM9 10l-1.5 10.5M15 10l1.5 10.5M12 10v4" />,
  atras: <path d="M15 5l-7 7 7 7" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  frio: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" />,
  consejo: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />,
  chispa: (
    <path d="M12 3.5 13.6 9a2 2 0 0 0 1.4 1.4l5.5 1.6-5.5 1.6a2 2 0 0 0-1.4 1.4L12 20.5 10.4 15A2 2 0 0 0 9 13.6L3.5 12 9 10.4A2 2 0 0 0 10.4 9Z" />
  ),
}

// La IA puede mandar un texto o una lista de pasos: siempre se muestra como lista
const comoLista = (valor) => (Array.isArray(valor) ? valor : valor ? [valor] : []).filter(Boolean)

// Las cifras de nutrición que pueden venir en la rutina, en el orden en que se muestran
const MACROS = [
  { clave: 'calorias', texto: 'kcal al día', tono: 'naranja' },
  { clave: 'proteina_g', texto: 'g de proteína', tono: 'morado' },
  { clave: 'carbohidratos_g', texto: 'g de carbohidratos', tono: 'azul' },
  { clave: 'grasas_g', texto: 'g de grasas', tono: 'verde' },
  { clave: 'agua_litros', texto: 'litros de agua', tono: 'azul' },
]

const Icono = ({ nombre }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONOS[nombre]}
  </svg>
)

// Tarjetas de la bienvenida: la primera arma una rutina, las demás preguntan
const SUGERENCIAS = [
  { icono: 'series', tono: 'azul', titulo: 'Ganar músculo', detalle: 'Cuántas series hacer por semana', pregunta: '¿Cuántas series debo hacer para ganar músculo?' },
  { icono: 'comida', tono: 'verde', titulo: 'Antes de entrenar', detalle: 'Qué comer y cuándo', pregunta: '¿Qué como antes de entrenar?' },
  { icono: 'calentar', tono: 'naranja', titulo: 'Calentamiento', detalle: 'Cómo preparar las piernas', pregunta: '¿Cómo calentar antes de piernas?' },
]

const fechaHoy = () =>
  new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

const saludo = () => {
  const hora = new Date().getHours()
  const momento = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = (localStorage.getItem('nombre') || '').trim().split(/\s+/)[0]
  return nombre ? `${momento}, ${nombre}` : momento
}

const OPCIONES_LUGAR = [
  { valor: 'casa', label: 'En casa', detalle: 'Con lo que tengas a mano', icono: 'casa', tono: 'verde' },
  { valor: 'gimnasio', label: 'En el gimnasio', detalle: 'Máquinas y pesas', icono: 'edificio', tono: 'morado' },
]

const OPCIONES_EQUIPO = [
  { valor: 'ninguno', label: 'Ninguno', detalle: 'Solo tu peso corporal', icono: 'persona', tono: 'azul' },
  { valor: 'basico', label: 'Básico', detalle: 'Mancuernas y bandas', icono: 'rutina', tono: 'morado' },
  { valor: 'completo', label: 'Completo', detalle: 'Máquinas de gimnasio', icono: 'maquina', tono: 'naranja' },
]

const OPCIONES_GRUPO_MUSCULAR = [
  { valor: 'tren superior', label: 'Tren superior', detalle: 'Pecho, espalda y brazos', icono: 'superior', tono: 'azul' },
  { valor: 'tren inferior', label: 'Tren inferior', detalle: 'Piernas y glúteos', icono: 'inferior', tono: 'verde' },
  { valor: 'cuerpo completo', label: 'Cuerpo completo', detalle: 'Todo en cada sesión', icono: 'calentar', tono: 'naranja' },
  { valor: 'recomendado', label: 'Recomiéndame tú', detalle: 'Según tu IMC y tu meta', icono: 'chispa', tono: 'morado' },
]

// Los tres pasos del armado de una rutina: una pregunta por pantalla
const PASOS_RUTINA = {
  [PASOS.LUGAR]: { n: 1, titulo: '¿Dónde vas a entrenar?', detalle: 'Así elijo ejercicios que puedas hacer.', opciones: OPCIONES_LUGAR },
  [PASOS.EQUIPO]: { n: 2, titulo: '¿Qué equipo tienes?', detalle: 'Solo usaré lo que tengas disponible.', opciones: OPCIONES_EQUIPO },
  [PASOS.GRUPO_MUSCULAR]: { n: 3, titulo: '¿Qué quieres entrenar?', detalle: 'Elige una opción o escribe la tuya.', opciones: OPCIONES_GRUPO_MUSCULAR },
}
const etiqueta = (opciones, valor) => opciones.find((o) => o.valor === valor)?.label

const MENSAJES_INICIALES = [
  {
    from: 'bot',
    text: 'Hola 👋 voy a armarte una rutina personalizada según tu IMC y tu meta. Solo necesito un par de datos más.',
  },
  { from: 'bot', text: '¿Dónde vas a entrenar?' },
]

// ── Historial de chats ──
// Se guarda en el servidor (se ve desde cualquier dispositivo) y queda una
// copia en este navegador, separada por usuario, para abrir rápido.
const CLAVE_VIEJA = 'body_rhythm_chats' // antes era una sola para todos los usuarios
const claveLocal = () => `body_rhythm_chats_${localStorage.getItem('username') || 'sin-usuario'}`

function cargarChats() {
  try {
    const raw = localStorage.getItem(claveLocal()) ?? localStorage.getItem(CLAVE_VIEJA)
    localStorage.removeItem(CLAVE_VIEJA)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarChats(chats) {
  try {
    localStorage.setItem(claveLocal(), JSON.stringify(chats))
  } catch {
    // si falla el guardado (localStorage lleno, etc.) no rompemos el chat
  }
}

// Lo que se manda al servidor: sin el indicador de "escribiendo..."
// Lo que se está escribiendo no se guarda: se guarda cuando termina
const paraGuardar = (chat) => ({ ...chat, mensajes: chat.mensajes.filter((m) => !m.typing && !m.escribiendo) })
// Conversación recién creada en la que aún no se ha hecho nada
const esVacio = (chat) => chat.paso === PASOS.LUGAR && chat.mensajes.length <= MENSAJES_INICIALES.length

function crearChatNuevo() {
  return {
    id: `chat_${Date.now()}`,
    titulo: 'Nueva rutina',
    fecha: new Date().toISOString(),
    mensajes: MENSAJES_INICIALES,
    lugar: null,
    equipo: null,
    grupoMuscular: null,
    resultado: null,
    paso: PASOS.LUGAR,
  }
}

export default function ChatbotRutina() {
  const navigate = useNavigate()

  // Al entrar no se abre ninguna conversación: se ve la bienvenida (chatActualId = null)
  const [chats, setChats] = useState(() => cargarChats().filter((c) => !esVacio(c)))
  const [chatActualId, setChatActualId] = useState(null)

  const chatActual = chats.find((c) => c.id === chatActualId) || null

  const [textoLibre, setTextoLibre] = useState('')
  const [enviandoLibre, setEnviandoLibre] = useState(false)
  const [guardando, setGuardando] = useState({ indice: null, error: '' })
  const finChat = useRef(null)
  const chatIdAnterior = useRef(chatActualId)
  const esPrimeraCarga = useRef(true)
  // { [chatId]: índice desde donde animar mensajes nuevos }
  const [umbrales, setUmbrales] = useState({})

  // La primera vez que se entra a una conversación (o al cambiar de una
  // a otra), los mensajes que ya existían no se vuelven a "escribir":
  // solo animamos los mensajes que se agreguen de aquí en adelante.
  if (chatActual && umbrales[chatActualId] === undefined) {
    setUmbrales((u) => ({ ...u, [chatActualId]: chatActual.mensajes.length }))
  }
  const umbralAnimacion = umbrales[chatActualId] ?? Infinity

  const nudgeScroll = () => {
    finChat.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }

  useEffect(() => {
    // No hacer scroll automático al entrar al chatbot ni al cambiar
    // de conversación en el historial — solo cuando de verdad se está
    // chateando (mensaje nuevo dentro de la misma conversación).
    if (esPrimeraCarga.current) {
      esPrimeraCarga.current = false
      chatIdAnterior.current = chatActualId
      return
    }
    if (chatIdAnterior.current !== chatActualId) {
      chatIdAnterior.current = chatActualId
      return
    }
    const ultimo = chatActual?.mensajes?.[chatActual.mensajes.length - 1]
    if (ultimo?.escribiendo) {
      // Como en un chat: si subiste a leer, no te baja a la fuerza
      const caja = finChat.current?.closest('.chat-messages')
      if (caja && caja.scrollHeight - caja.scrollTop - caja.clientHeight > 220) return
      finChat.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
      return
    }
    finChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatActual?.mensajes, chatActual?.paso, chatActualId])

  useEffect(() => {
    guardarChats(chats)
  }, [chats])

  // Al abrir: trae las conversaciones del servidor y las junta con las de este
  // navegador (si una está en los dos lados, gana la que tiene más mensajes).
  const sincronizados = useRef({}) // id -> JSON de lo último guardado en el servidor
  const chatsRef = useRef(chats)
  useEffect(() => {
    chatsRef.current = chats
  })
  const [servidorListo, setServidorListo] = useState(false)

  useEffect(() => {
    let activo = true
    api
      .get('/entrenamientos/chatbot/chats/')
      .then((res) => {
        if (!activo) return
        const remotos = res.data.chats || []
        remotos.forEach((c) => {
          sincronizados.current[c.id] = JSON.stringify(c)
        })
        if (!remotos.length) return
        // Las conversaciones vacías de este navegador sobran si ya hay del servidor
        const locales = chatsRef.current.filter((c) => !esVacio(c))
        const porId = new Map(remotos.map((c) => [c.id, c]))
        locales.forEach((local) => {
          const remoto = porId.get(local.id)
          if (!remoto || local.mensajes.length > remoto.mensajes.length) porId.set(local.id, local)
        })
        setChats([...porId.values()])
      })
      .catch(() => {})
      .finally(() => activo && setServidorListo(true))
    return () => {
      activo = false
    }
  }, [])

  // Guarda en el servidor las conversaciones que cambiaron (un momento después
  // del último cambio, para no mandar una petición por cada mensaje)
  useEffect(() => {
    if (!servidorListo) return
    const espera = setTimeout(() => {
      chats.forEach((chat) => {
        if (esVacio(chat)) return
        const datos = paraGuardar(chat)
        const json = JSON.stringify(datos)
        if (sincronizados.current[chat.id] === json) return
        api
          .put(`/entrenamientos/chatbot/chats/${encodeURIComponent(chat.id)}/`, datos)
          .then(() => {
            sincronizados.current[chat.id] = json
          })
          .catch(() => {})
      })
    }, 1200)
    return () => clearTimeout(espera)
  }, [chats, servidorListo])

  // Actualiza el chat activo dentro del array de chats (inmutable)
  const actualizarChatActual = (cambios) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatActualId ? { ...c, ...cambios } : c))
    )
  }

  const agregarMensaje = (msg) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatActualId ? { ...c, mensajes: [...c.mensajes, msg] } : c
      )
    )
  }

  // "Nuevo chat": vuelve a la bienvenida (y descarta la conversación si quedó vacía)
  const nuevaConversacion = () => {
    setChats((prev) => prev.filter((c) => !esVacio(c)))
    setChatActualId(null)
    setTextoLibre('')
  }

  // Desde la bienvenida: empieza el armado guiado de una rutina
  const empezarRutina = () => {
    const nuevo = crearChatNuevo()
    setChats((prev) => [nuevo, ...prev.filter((c) => !esVacio(c))])
    setChatActualId(nuevo.id)
    setTextoLibre('')
  }

  // Desde la bienvenida: una pregunta abre una conversación nueva con esa pregunta
  const preguntarDesdeBienvenida = (texto) => {
    const pregunta = texto.trim()
    if (!pregunta || enviandoLibre) return
    const nuevo = {
      ...crearChatNuevo(),
      titulo: pregunta.length > 60 ? `${pregunta.slice(0, 57)}…` : pregunta,
      mensajes: [],
      paso: PASOS.LIBRE,
    }
    setChats((prev) => [nuevo, ...prev.filter((c) => !esVacio(c))])
    setChatActualId(nuevo.id)
    setTextoLibre('')
    preguntar(pregunta, nuevo)
  }

  const cargarConversacion = (id) => {
    setChatActualId(id)
    setTextoLibre('')
  }

  const eliminarConversacion = (chat) => {
    if (!window.confirm(`¿Borrar la conversación "${chat.titulo}"?`)) return
    api.delete(`/entrenamientos/chatbot/chats/${encodeURIComponent(chat.id)}/`).catch(() => {})
    delete sincronizados.current[chat.id]
    setChats((prev) => prev.filter((c) => c.id !== chat.id))
    if (chat.id === chatActualId) setChatActualId(null)
    setTextoLibre('')
  }

  const pasoAtras = () => {
    if (chatActual.paso === PASOS.LUGAR) {
      nuevaConversacion()
      return
    }
    const anterior = chatActual.paso === PASOS.EQUIPO
      ? { paso: PASOS.LUGAR, lugar: null }
      : { paso: PASOS.EQUIPO, equipo: null }
    actualizarChatActual({ ...anterior, mensajes: chatActual.mensajes.slice(0, -2) })
    setTextoLibre('')
  }

  const elegirPaso = (opcion) => {
    if (chatActual.paso === PASOS.LUGAR) elegirLugar(opcion)
    else if (chatActual.paso === PASOS.EQUIPO) elegirEquipo(opcion)
    else elegirGrupoMuscular(opcion)
  }

  const elegirLugar = (opcion) => {
    actualizarChatActual({ lugar: opcion.valor, paso: PASOS.EQUIPO })
    agregarMensaje({ from: 'user', text: opcion.label })
    agregarMensaje({ from: 'bot', text: '¿Qué equipo tienes disponible?' })
  }

  const elegirEquipo = (opcion) => {
    actualizarChatActual({ equipo: opcion.valor, paso: PASOS.GRUPO_MUSCULAR })
    agregarMensaje({ from: 'user', text: opcion.label })
    agregarMensaje({
      from: 'bot',
      text: '¿Qué grupo muscular quieres entrenar? Elige una opción o escribe la tuya.',
    })
  }

  const generarRutina = async (valorGrupoMuscular) => {
    setEnviandoLibre(true)
    agregarMensaje({ from: 'bot', text: '', typing: true })
    actualizarChatActual({ grupoMuscular: valorGrupoMuscular, paso: PASOS.CARGANDO })

    // Pone la rutina (a medias o completa) como último mensaje del chat
    const ponerRutina = (resultado, escribiendo) =>
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
          const base = c.mensajes.filter((m) => !m.typing && !m.escribiendo)
          const mensaje = escribiendo ? { from: 'bot', rutina: resultado, escribiendo: true } : { from: 'bot', rutina: resultado }
          return {
            ...c,
            mensajes: [...base, mensaje],
            paso: PASOS.RESULTADO,
            ...(escribiendo ? {} : { resultado, titulo: resultado.rutina?.nombre || 'Rutina generada' }),
          }
        })
      )

    // La respuesta llega por partes: una línea JSON por evento
    let leidas = 0
    let datos = null
    let texto = ''
    let final = null
    let falla = null
    const leer = (crudo) => {
      const lineas = crudo.split('\n')
      for (; leidas < lineas.length - 1; leidas++) {
        if (!lineas[leidas].trim()) continue
        const ev = JSON.parse(lineas[leidas])
        if (ev.t === 'inicio') datos = ev
        else if (ev.t === 'texto') texto += ev.d
        else if (ev.t === 'fin') final = ev.resultado
        else if (ev.t === 'error') falla = ev.error
      }
    }
    let ultimoDibujo = 0
    const dibujar = () => {
      const parcial = jsonParcial(texto)
      if (parcial) ponerRutina({ imc: datos?.imc, rango_imc: datos?.rango_imc, fuente: 'ia', rutina: parcial }, true)
    }

    try {
      const res = await api.post(
        '/entrenamientos/chatbot/',
        {
          lugar: chatActual.lugar,
          equipo: chatActual.equipo,
          grupo_muscular: valorGrupoMuscular,
          por_partes: true,
        },
        {
          responseType: 'text',
          // La rutina llega por partes y puede tardar: más margen que el resto de la app
          timeout: 180000,
          onDownloadProgress: (e) => {
            const crudo = e.event?.target?.responseText
            if (!crudo) return
            leer(crudo)
            // Hasta 20 veces por segundo, para que se vea fluido sin trabar la página
            const ahora = performance.now()
            if (!final && texto && ahora - ultimoDibujo > 50) {
              ultimoDibujo = ahora
              dibujar()
            }
          },
        }
      )
      leer(String(res.data || '') + '\n')
      if (falla) throw new Error(falla)
      if (!final) throw new Error('La rutina llegó incompleta, intenta de nuevo.')
      ponerRutina(final, false)
    } catch (err) {
      // Con responseType 'text' el error del servidor llega como texto JSON
      let datosError = err.response?.data
      if (typeof datosError === 'string') {
        try {
          datosError = JSON.parse(datosError)
        } catch {
          datosError = null
        }
      }
      const mensajeError =
        datosError?.error || datosError?.detail || err.message || 'No se pudo generar la rutina, intenta de nuevo.'
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing && !m.escribiendo)
          return {
            ...c,
            mensajes: [...sinTyping, { from: 'bot', text: `⚠️ ${mensajeError}` }],
            paso: PASOS.ERROR,
          }
        })
      )
    } finally {
      setEnviandoLibre(false)
    }
  }

  // Guarda la rutina del mensaje como rutinas del usuario (una por día)
  const guardarRutina = async (indice) => {
    const mensaje = chatActual.mensajes[indice]
    setGuardando({ indice, error: '' })
    try {
      const res = await api.post('/entrenamientos/chatbot/guardar/', { rutina: mensaje.rutina.rutina })
      setChats((prev) =>
        prev.map((c) =>
          c.id !== chatActualId
            ? c
            : { ...c, mensajes: c.mensajes.map((m, j) => (j === indice ? { ...m, guardado: res.data } : m)) }
        )
      )
      setGuardando({ indice: null, error: '' })
    } catch (err) {
      setGuardando({
        indice,
        error: err.response?.data?.error || 'No se pudo guardar la rutina, intenta de nuevo.',
      })
    }
  }

  const elegirGrupoMuscular = (opcion) => {
    agregarMensaje({ from: 'user', text: opcion.label })
    generarRutina(opcion.valor)
  }

  const enviarGrupoMuscular = async (e) => {
    e.preventDefault()
    const texto = textoLibre.trim()
    if (!texto || enviandoLibre) return

    setTextoLibre('')
    agregarMensaje({ from: 'user', text: texto })
    generarRutina(texto)
  }

  const reiniciar = () => {
    const fresh = crearChatNuevo()
    actualizarChatActual({
      mensajes: fresh.mensajes,
      lugar: null,
      equipo: null,
      grupoMuscular: null,
      resultado: null,
      paso: PASOS.LUGAR,
      titulo: 'Nueva rutina',
    })
  }

  // ── Chat libre: preguntas escritas, respondidas por Gemini ──
  const enviarPreguntaLibre = (e) => {
    e.preventDefault()
    const texto = textoLibre.trim()
    if (!texto || enviandoLibre) return
    setTextoLibre('')
    preguntar(texto, chatActual)
  }

  const preguntar = async (texto, chat) => {
    const historialParaApi = chat.mensajes
      .filter((m) => !m.typing && !m.rutina)
      .map((m) => ({ rol: m.from === 'user' ? 'user' : 'model', texto: m.text }))

    setChats((prev) =>
      prev.map((c) =>
        c.id === chat.id
          ? { ...c, mensajes: [...c.mensajes, { from: 'user', text: texto }, { from: 'bot', text: '', typing: true }] }
          : c
      )
    )
    setEnviandoLibre(true)

    try {
      const res = await api.post('/entrenamientos/chatbot/mensaje/', {
        mensaje: texto,
        historial: historialParaApi,
        rutina_actual: chat.resultado?.rutina || null,
      })
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chat.id) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing)
          return {
            ...c,
            mensajes: [...sinTyping, { from: 'bot', text: res.data.respuesta, markdown: true }],
          }
        })
      )
    } catch (err) {
      const mensajeError =
        err.response?.data?.error || err.response?.data?.detail || 'No pude procesar tu pregunta, intenta de nuevo.'
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chat.id) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing)
          return { ...c, mensajes: [...sinTyping, { from: 'bot', text: mensajeError }] }
        })
      )
    } finally {
      setEnviandoLibre(false)
    }
  }

  const agruparPorDia = (ejercicios) =>
    ejercicios.reduce((dias, ej) => {
      ;(dias[ej.dia] = dias[ej.dia] || []).push(ej)
      return dias
    }, {})

  const chatActivo = [PASOS.RESULTADO, PASOS.ERROR, PASOS.LIBRE].includes(chatActual?.paso)

  const formatearFecha = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  return (
    <>
    <Navbar />
    <div className="chatbot-page">
      {/* ── SIDEBAR ── */}
      <aside className="chat-sidebar">
        <button className="sidebar-back" onClick={() => navigate('/dashboard')}>
          ← Entrenamientos
        </button>

        <button className="sidebar-nuevo" onClick={nuevaConversacion}>
          + Nuevo chat
        </button>

        <p className="sidebar-titulo">Conversaciones</p>

        <div className="sidebar-lista">
          {chats
            .slice()
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map((c) => (
              <div key={c.id} className={`sidebar-fila ${c.id === chatActualId ? 'activo' : ''}`}>
                <button
                  className={`sidebar-item ${c.id === chatActualId ? 'activo' : ''}`}
                  onClick={() => cargarConversacion(c.id)}
                >
                  <span className="sidebar-item-titulo">{c.titulo}</span>
                  <span className="sidebar-item-fecha">{formatearFecha(c.fecha)}</span>
                </button>
                <button
                  type="button"
                  className="sidebar-borrar"
                  onClick={() => eliminarConversacion(c)}
                  aria-label={`Borrar la conversación ${c.titulo}`}
                  title="Borrar"
                >
                  ×
                </button>
              </div>
            ))}
        </div>
      </aside>

      {/* ── CHAT PRINCIPAL ── */}
      <div className="chatbot-main">
        {!chatActual ? (
          <div className="chat-bienvenida">
            <div className="cb-orbe" aria-hidden="true" />
            <p className="cb-fecha">{fechaHoy()}</p>
            <h1>{saludo()}</h1>
            <p className="cb-sub">¿Qué entrenamos hoy?</p>

            <form
              className="cb-buscador"
              onSubmit={(e) => {
                e.preventDefault()
                preguntarDesdeBienvenida(textoLibre)
              }}
            >
              <span className="cb-buscador-icono"><Icono nombre="chispa" /></span>
              <input
                type="text"
                placeholder="Pregunta sobre entrenamiento, técnica o nutrición"
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                aria-label="Escribe tu pregunta"
                autoFocus
              />
              <button type="submit" disabled={!textoLibre.trim() || enviandoLibre} aria-label="Enviar">
                <Icono nombre="enviar" />
              </button>
            </form>

            <div className="cb-tarjetas">
              <button type="button" className="cb-tarjeta principal" onClick={empezarRutina}>
                <span className="cb-tarjeta-icono morado"><Icono nombre="rutina" /></span>
                <span className="cb-tarjeta-texto">
                  <strong>Armar una rutina</strong>
                  <small>Hecha para ti en tres pasos</small>
                </span>
              </button>
              {SUGERENCIAS.map((sug) => (
                <button key={sug.titulo} type="button" className="cb-tarjeta" onClick={() => preguntarDesdeBienvenida(sug.pregunta)}>
                  <span className={`cb-tarjeta-icono ${sug.tono}`}><Icono nombre={sug.icono} /></span>
                  <span className="cb-tarjeta-texto">
                    <strong>{sug.titulo}</strong>
                    <small>{sug.detalle}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div className="chatbot-card sin-marco">
          <div className="cb-orbe cb-orbe-chat" aria-hidden="true" />

          {chatActual.paso === PASOS.CARGANDO ? (
            <div className="cb-paso cb-paso-cargando" role="status">
              <div className="cb-cargando-anillo" aria-hidden="true"><Icono nombre="chispa" /></div>
              <h2 className="cb-paso-titulo">Armando tu rutina</h2>
              <p className="cb-paso-detalle">Elijo los ejercicios según tu IMC, tu meta y tu equipo.</p>
              <div className="cb-paso-respuestas">
                {[etiqueta(OPCIONES_LUGAR, chatActual.lugar), etiqueta(OPCIONES_EQUIPO, chatActual.equipo), etiqueta(OPCIONES_GRUPO_MUSCULAR, chatActual.grupoMuscular) || chatActual.grupoMuscular]
                  .filter(Boolean)
                  .map((r) => <span key={r}>{r}</span>)}
              </div>
            </div>
          ) : PASOS_RUTINA[chatActual.paso] ? (() => {
            const paso = PASOS_RUTINA[chatActual.paso]
            const tramos = [
              { nombre: 'Lugar', valor: etiqueta(OPCIONES_LUGAR, chatActual.lugar) },
              { nombre: 'Equipo', valor: etiqueta(OPCIONES_EQUIPO, chatActual.equipo) },
              { nombre: 'Enfoque', valor: null },
            ]
            return (
              <div className="cb-paso" key={chatActual.paso}>
                <button type="button" className="cb-paso-atras" onClick={pasoAtras}>
                  <Icono nombre="atras" />
                  {paso.n === 1 ? 'Cancelar' : 'Atrás'}
                </button>

                <ol className="cb-paso-progreso" aria-label={`Paso ${paso.n} de 3`}>
                  {tramos.map((t, i) => (
                    <li key={t.nombre} className={i + 1 < paso.n ? 'hecho' : i + 1 === paso.n ? 'actual' : ''}>
                      <i aria-hidden="true" />
                      <span>{t.valor || t.nombre}</span>
                    </li>
                  ))}
                </ol>
                <h2 className="cb-paso-titulo">{paso.titulo}</h2>
                <p className="cb-paso-detalle">{paso.detalle}</p>

                <div className={`cb-paso-opciones de-${paso.opciones.length}`}>
                  {paso.opciones.map((op) => (
                    <button key={op.valor} type="button" className="cb-paso-opcion" onClick={() => elegirPaso(op)} disabled={enviandoLibre}>
                      <span className={`cb-tarjeta-icono ${op.tono}`}><Icono nombre={op.icono} /></span>
                      <strong>{op.label}</strong>
                      <small>{op.detalle}</small>
                    </button>
                  ))}
                </div>

                {chatActual.paso === PASOS.GRUPO_MUSCULAR && (
                  <form className="cb-buscador cb-paso-libre" onSubmit={enviarGrupoMuscular}>
                    <input
                      type="text"
                      placeholder="O escribe algo específico, como espalda y hombros"
                      value={textoLibre}
                      onChange={(e) => setTextoLibre(e.target.value)}
                      disabled={enviandoLibre}
                      aria-label="Escribe qué quieres entrenar"
                    />
                    <button type="submit" disabled={enviandoLibre || !textoLibre.trim()} aria-label="Enviar">
                      <Icono nombre="enviar" />
                    </button>
                  </form>
                )}

              </div>
            )
          })() : (
          <>
          <div className="chat-messages">
            {chatActual.mensajes.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                {m.typing ? (
                  <div className="msg-bubble">
                    <span className="typing-dots">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                ) : m.rutina ? (
                  <div className={`msg-bubble rutina-bubble${m.escribiendo ? ' escribiendo' : ''}`}>
                    <div className="rutina-resultado">
                      {m.rutina.fuente === 'respaldo' && (
                        <p className="rutina-aviso">
                          El generador de IA no estuvo disponible, así que te asigné una
                          rutina de nuestro catálogo según tu perfil.
                        </p>
                      )}

                      <header className="rutina-cabecera">
                        <span className="cb-tarjeta-icono morado rutina-cabecera-icono">
                          <Icono nombre="rutina" />
                        </span>
                        <div>
                          <div className="rutina-chips">
                            <span className="rutina-imc">
                              IMC {m.rutina.imc} · {m.rutina.rango_imc}
                            </span>
                            {m.rutina.rutina.nivel && (
                              <span className="rutina-nivel">{m.rutina.rutina.nivel}</span>
                            )}
                          </div>
                          <h3>{m.rutina.rutina.nombre}</h3>
                          {m.rutina.rutina.objetivo && (
                            <p className="rutina-objetivo">{m.rutina.rutina.objetivo}</p>
                          )}
                        </div>
                      </header>

                      <p className="rutina-desc">{m.rutina.rutina.descripcion}</p>
                      {m.rutina.rutina.estructura && (
                        <p className="rutina-estructura">{m.rutina.rutina.estructura}</p>
                      )}

                      <div className="rutina-meta">
                        <span>
                          <Icono nombre="series" />
                          {m.rutina.rutina.dias_por_semana} días por semana
                        </span>
                        <span>
                          <Icono nombre="reloj" />
                          {m.rutina.rutina.duracion_minutos} min por sesión
                        </span>
                        <span>
                          <Icono nombre="rutina" />
                          {m.rutina.rutina.ejercicios?.length || 0} ejercicios
                        </span>
                      </div>

                      {comoLista(m.rutina.rutina.calentamiento).length > 0 && (
                        <div className="rutina-nota">
                          <span className="cb-tarjeta-icono naranja"><Icono nombre="calentar" /></span>
                          <div>
                            <strong>Calentamiento</strong>
                            <ol className="rutina-pasos">
                              {comoLista(m.rutina.rutina.calentamiento).map((paso, idx) => <li key={idx}>{paso}</li>)}
                            </ol>
                          </div>
                        </div>
                      )}

                      {Object.entries(agruparPorDia((m.rutina.rutina.ejercicios || []).filter((ej) => ej?.dia && ej.nombre))).map(
                        ([dia, ejercicios], d) => (
                          <section key={d} className="dia-rutina" style={{ '--d': m.escribiendo ? 0 : d }}>
                            <h4>
                              <span className="dia-rutina-nombre">{dia}</span>
                              <small>{ejercicios.length} ejercicios</small>
                            </h4>
                            <ol>
                              {ejercicios.map((ej, n) => (
                                <li key={n} style={{ '--n': n }}>
                                  <span className="ejercicio-num" aria-hidden="true">{n + 1}</span>
                                  <div className="ejercicio-cuerpo">
                                    <div className="ejercicio-fila">
                                      <div>
                                        <strong>{ej.nombre}</strong>
                                        {ej.musculos && <span className="ejercicio-musculos">{ej.musculos}</span>}
                                      </div>
                                      <span className="ejercicio-datos">
                                        {ej.series && (ej.duracion_segundos
                                          ? <span>{ej.series} × {ej.duracion_segundos} s</span>
                                          : ej.repeticiones && <span>{ej.series} × {ej.repeticiones}</span>)}
                                        {!ej.series && ej.duracion_segundos && <span>{ej.duracion_segundos} s</span>}
                                        {ej.descanso_segundos && (
                                          <span className="ejercicio-descanso" title="Descanso">
                                            <Icono nombre="reloj" />
                                            {ej.descanso_segundos} s
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    {(ej.intensidad || ej.tempo) && (
                                      <div className="ejercicio-etiquetas">
                                        {ej.intensidad && <span>Intensidad <b>{ej.intensidad}</b></span>}
                                        {ej.tempo && <span title="Segundos de bajada, pausa y subida">Tempo <b>{ej.tempo}</b></span>}
                                      </div>
                                    )}
                                    {ej.ejercicio_id === null && (
                                      <span className="ejercicio-fuera">No está en la biblioteca: no se guardará</span>
                                    )}
                                    {(ej.consejo || ej.error_comun || ej.carga) && (
                                      <dl className="ejercicio-detalle">
                                        {ej.consejo && (<><dt>Técnica</dt><dd>{ej.consejo}</dd></>)}
                                        {ej.error_comun && (<><dt>Evita</dt><dd>{ej.error_comun}</dd></>)}
                                        {ej.carga && (<><dt>Peso</dt><dd>{ej.carga}</dd></>)}
                                      </dl>
                                    )}
                                    {ej.alternativa && (
                                      <p className="ejercicio-alternativa">Alternativa: <b>{ej.alternativa}</b></p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </section>
                        )
                      )}

                      {comoLista(m.rutina.rutina.enfriamiento).length > 0 && (
                        <div className="rutina-nota">
                          <span className="cb-tarjeta-icono azul"><Icono nombre="frio" /></span>
                          <div>
                            <strong>Enfriamiento</strong>
                            <ol className="rutina-pasos">
                              {comoLista(m.rutina.rutina.enfriamiento).map((paso, idx) => <li key={idx}>{paso}</li>)}
                            </ol>
                          </div>
                        </div>
                      )}

                      {comoLista(m.rutina.rutina.progresion).length > 0 && (
                        <div className="rutina-nota">
                          <span className="cb-tarjeta-icono morado"><Icono nombre="series" /></span>
                          <div>
                            <strong>Cómo progresar</strong>
                            <ol className="rutina-etapas">
                              {comoLista(m.rutina.rutina.progresion).map((etapa, idx) => <li key={idx}>{etapa}</li>)}
                            </ol>
                          </div>
                        </div>
                      )}

                      {m.rutina.rutina.nutricion && typeof m.rutina.rutina.nutricion === 'object' && (
                        <div className="rutina-nota rutina-nutricion">
                          <span className="cb-tarjeta-icono verde"><Icono nombre="comida" /></span>
                          <div>
                            <strong>Tu alimentación</strong>
                            {m.rutina.rutina.nutricion.resumen && <p>{m.rutina.rutina.nutricion.resumen}</p>}
                            <div className="rutina-macros">
                              {MACROS.filter((x) => Number(m.rutina.rutina.nutricion[x.clave]) > 0).map((x) => (
                                <div key={x.clave} className={`rutina-macro ${x.tono}`}>
                                  <b>{Number(m.rutina.rutina.nutricion[x.clave]).toLocaleString('es-CO')}</b>
                                  <span>{x.texto}</span>
                                </div>
                              ))}
                            </div>
                            {comoLista(m.rutina.rutina.nutricion.consejos).length > 0 && (
                              <ul>
                                {comoLista(m.rutina.rutina.nutricion.consejos).map((c, idx) => <li key={idx}>{c}</li>)}
                              </ul>
                            )}
                            <small className="rutina-nota-aviso">Cifras aproximadas. Ajústalas con un nutricionista si tienes alguna condición de salud.</small>
                          </div>
                        </div>
                      )}

                      {m.rutina.rutina.descanso && (
                        <div className="rutina-nota">
                          <span className="cb-tarjeta-icono azul"><Icono nombre="reloj" /></span>
                          <div>
                            <strong>Descanso y recuperación</strong>
                            <p>{m.rutina.rutina.descanso}</p>
                          </div>
                        </div>
                      )}

                      {Array.isArray(m.rutina.rutina.consejos_generales) &&
                        m.rutina.rutina.consejos_generales.length > 0 && (
                          <div className="rutina-nota rutina-consejos">
                            <span className="cb-tarjeta-icono verde"><Icono nombre="consejo" /></span>
                            <div>
                              <strong>Consejos para esta rutina</strong>
                              <ul>
                                {m.rutina.rutina.consejos_generales.map((c, idx) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                      {m.escribiendo ? (
                      <p className="rutina-escribiendo" role="status">
                        <span className="typing-dots"><span></span><span></span><span></span></span>
                        Escribiendo tu rutina…
                      </p>
                      ) : (
                      <div className="rutina-guardar">
                        {m.guardado ? (
                          <>
                            <p className="rutina-guardada">
                              ✓ Guardada en tus rutinas
                              {m.guardado.rutinas.length > 1 && ` (${m.guardado.rutinas.length} días)`}
                            </p>
                            {m.guardado.omitidos?.length > 0 && (
                              <p className="rutina-omitidos">
                                No se agregaron porque no están en la biblioteca: {m.guardado.omitidos.join(', ')}.
                              </p>
                            )}
                            <button type="button" className="btn-guardar-rutina" onClick={() => navigate('/rutinas')}>
                              Ir a mis rutinas →
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-guardar-rutina"
                              onClick={() => guardarRutina(i)}
                              disabled={guardando.indice === i && !guardando.error}
                            >
                              {guardando.indice === i && !guardando.error ? 'Guardando…' : 'Guardar en mis rutinas'}
                            </button>
                            {guardando.indice === i && guardando.error && (
                              <p className="rutina-omitidos">{guardando.error}</p>
                            )}
                          </>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                ) : m.markdown ? (
                  <div className="msg-respuesta">
                    <span className="msg-firma"><span className="msg-firma-icono"><Icono nombre="chispa" /></span>Asistente</span>
                    <MarkdownAnimado
                      text={m.text}
                      enabled={m.from === 'bot' && i >= umbralAnimacion}
                      onTick={nudgeScroll}
                    />
                  </div>
                ) : m.from === 'bot' && String(m.text || '').startsWith('⚠️') ? (
                  <div className="msg-bubble msg-aviso" role="alert">
                    <span className="cb-tarjeta-icono naranja" aria-hidden="true">!</span>
                    <span>{String(m.text).replace(/^⚠️\s*/, '')}</span>
                  </div>
                ) : (
                  <div className="msg-bubble">
                    {m.from === 'bot' ? (
                      <TextoAnimado
                        text={m.text}
                        enabled={i >= umbralAnimacion}
                        onTick={nudgeScroll}
                      />
                    ) : (
                      m.text
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={finChat} />
          </div>

          {chatActual.paso === PASOS.ERROR && (
            <div className="chat-actions">
              <button className="btn-primary" onClick={reiniciar}>
                Intentar de nuevo
              </button>
            </div>
          )}


          {chatActivo && (
            <form className="cb-buscador cb-chat-entrada" onSubmit={enviarPreguntaLibre}>
              <input
                type="text"
                placeholder="Pregunta lo que quieras, como qué hacer si te duele la rodilla"
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                disabled={enviandoLibre}
                aria-label="Escribe tu pregunta"
              />
              <button type="submit" disabled={enviandoLibre || !textoLibre.trim()} aria-label="Enviar">
                <Icono nombre="enviar" />
              </button>
            </form>
          )}
          </>
          )}
        </div>
        )}
      </div>
    </div>
    </>
  )
}