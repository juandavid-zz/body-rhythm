import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../api/api'
import '../css/dashboard.css'

// ── Efecto de escritura progresiva (estilo ChatGPT) ──
function useTypewriter(text, { enabled = true, speed = 16, chunk = 2 } = {}) {
  const [mostrado, setMostrado] = useState(enabled ? '' : text || '')
  const [terminado, setTerminado] = useState(!enabled)
  const onTickRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setMostrado(text || '')
      setTerminado(true)
      return
    }
    if (!text) {
      setMostrado('')
      setTerminado(true)
      return
    }
    setMostrado('')
    setTerminado(false)
    let i = 0
    const id = setInterval(() => {
      i += chunk
      setMostrado(text.slice(0, i))
      onTickRef.current?.()
      if (i >= text.length) {
        clearInterval(id)
        setTerminado(true)
      }
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled])

  return { mostrado, terminado, onTickRef }
}

function TextoAnimado({ text, enabled, onTick }) {
  const { mostrado, terminado, onTickRef } = useTypewriter(text, { enabled })
  onTickRef.current = onTick
  return (
    <>
      {mostrado}
      {!terminado && <span className="cursor-escritura">▍</span>}
    </>
  )
}

function MarkdownAnimado({ text, enabled, onTick }) {
  const { mostrado, terminado, onTickRef } = useTypewriter(text, {
    enabled,
    speed: 12,
    chunk: 3,
  })
  onTickRef.current = onTick
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
}

const OPCIONES_LUGAR = [
  { valor: 'casa', label: '🏠 En casa' },
  { valor: 'gimnasio', label: '🏋️ En el gimnasio' },
]

const OPCIONES_EQUIPO = [
  { valor: 'ninguno', label: 'Ninguno (peso corporal)' },
  { valor: 'basico', label: 'Básico (mancuernas, bandas)' },
  { valor: 'completo', label: 'Completo (máquinas de gym)' },
]

const OPCIONES_GRUPO_MUSCULAR = [
  { valor: 'tren superior', label: '💪 Tren superior' },
  { valor: 'tren inferior', label: '🦵 Tren inferior' },
  { valor: 'cuerpo completo', label: '🔥 Cuerpo completo' },
  { valor: 'recomendado', label: '✨ Recomiéndame tú' },
]

const MENSAJES_INICIALES = [
  {
    from: 'bot',
    text: 'Hola 👋 voy a armarte una rutina personalizada según tu IMC y tu meta. Solo necesito un par de datos más.',
  },
  { from: 'bot', text: '¿Dónde vas a entrenar?' },
]

// ── Persistencia local del historial de chats (por navegador, por ahora) ──
const STORAGE_KEY = 'body_rhythm_chats'

function cargarChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarChats(chats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  } catch {
    // si falla el guardado (localStorage lleno, etc.) no rompemos el chat
  }
}

function crearChatNuevo() {
  return {
    id: `chat_${Date.now()}`,
    titulo: 'Nueva conversación',
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

  const [chats, setChats] = useState(() => {
    const guardados = cargarChats()
    return guardados.length ? guardados : [crearChatNuevo()]
  })
  const [chatActualId, setChatActualId] = useState(() => chats[0].id)

  const chatActual = chats.find((c) => c.id === chatActualId) || chats[0]

  const [textoLibre, setTextoLibre] = useState('')
  const [enviandoLibre, setEnviandoLibre] = useState(false)
  const finChat = useRef(null)
  const chatIdAnterior = useRef(chatActualId)
  const esPrimeraCarga = useRef(true)
  const umbralAnimacion = useRef({}) // { [chatId]: índice desde donde animar mensajes nuevos }

  useEffect(() => {
    // La primera vez que se entra a una conversación (o al cambiar de una
    // a otra), los mensajes que ya existían no se vuelven a "escribir":
    // solo animamos los mensajes que se agreguen de aquí en adelante.
    if (umbralAnimacion.current[chatActualId] === undefined) {
      const chat = chats.find((c) => c.id === chatActualId)
      umbralAnimacion.current[chatActualId] = chat ? chat.mensajes.length : 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatActualId])

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
    finChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatActual.mensajes, chatActual.paso, chatActualId])

  useEffect(() => {
    guardarChats(chats)
  }, [chats])

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

  const nuevaConversacion = () => {
    const nuevo = crearChatNuevo()
    setChats((prev) => [nuevo, ...prev])
    setChatActualId(nuevo.id)
    setTextoLibre('')
  }

  const cargarConversacion = (id) => {
    setChatActualId(id)
    setTextoLibre('')
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

    try {
      const res = await api.post('/entrenamientos/chatbot/', {
        lugar: chatActual.lugar,
        equipo: chatActual.equipo,
        grupo_muscular: valorGrupoMuscular,
      })

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing)
          return {
            ...c,
            mensajes: [...sinTyping, { from: 'bot', rutina: res.data }],
            resultado: res.data,
            paso: PASOS.RESULTADO,
            titulo: res.data.rutina?.nombre || 'Rutina generada',
          }
        })
      )
    } catch (err) {
      const mensajeError =
        err.response?.data?.error || 'No se pudo generar la rutina, intenta de nuevo.'
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing)
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
      titulo: 'Nueva conversación',
    })
  }

  // ── Chat libre: preguntas escritas, respondidas por Gemini ──
  const enviarPreguntaLibre = async (e) => {
    e.preventDefault()
    const texto = textoLibre.trim()
    if (!texto || enviandoLibre) return

    const historialParaApi = chatActual.mensajes
      .filter((m) => !m.typing && !m.rutina)
      .map((m) => ({ rol: m.from === 'user' ? 'user' : 'model', texto: m.text }))

    agregarMensaje({ from: 'user', text: texto })
    agregarMensaje({ from: 'bot', text: '', typing: true })
    setTextoLibre('')
    setEnviandoLibre(true)

    try {
      const res = await api.post('/entrenamientos/chatbot/mensaje/', {
        mensaje: texto,
        historial: historialParaApi,
        rutina_actual: chatActual.resultado?.rutina || null,
      })
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
          const sinTyping = c.mensajes.filter((m) => !m.typing)
          return {
            ...c,
            mensajes: [...sinTyping, { from: 'bot', text: res.data.respuesta, markdown: true }],
          }
        })
      )
    } catch (err) {
      const mensajeError =
        err.response?.data?.error || 'No pude procesar tu pregunta, intenta de nuevo.'
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActualId) return c
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

  const chatActivo =
    chatActual.paso === PASOS.RESULTADO || chatActual.paso === PASOS.ERROR

  const formatearFecha = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="chatbot-page">
      {/* ── SIDEBAR ── */}
      <aside className="chat-sidebar">
        <button className="sidebar-back" onClick={() => navigate('/dashboard')}>
          ← Entrenamientos
        </button>

        <button className="sidebar-nuevo" onClick={nuevaConversacion}>
          + Nueva rutina
        </button>

        <div className="sidebar-lista">
          {chats
            .slice()
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map((c) => (
              <button
                key={c.id}
                className={`sidebar-item ${c.id === chatActualId ? 'activo' : ''}`}
                onClick={() => cargarConversacion(c.id)}
              >
                <span className="sidebar-item-titulo">{c.titulo}</span>
                <span className="sidebar-item-fecha">{formatearFecha(c.fecha)}</span>
              </button>
            ))}
        </div>
      </aside>

      {/* ── CHAT PRINCIPAL ── */}
      <div className="chatbot-main">
        <div className="chatbot-card">
          <h2>Asistente de rutinas</h2>

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
                  <div className="msg-bubble rutina-bubble">
                    <div className="rutina-resultado">
                      {m.rutina.fuente === 'respaldo' && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                          El generador de IA no estuvo disponible, así que te asigné una
                          rutina de nuestro catálogo según tu perfil. Igual te va a servir 💪
                        </p>
                      )}

                      <span className="rutina-imc">
                        IMC {m.rutina.imc} · {m.rutina.rango_imc}
                      </span>
                      {m.rutina.rutina.nivel && (
                        <span className="rutina-nivel">{m.rutina.rutina.nivel}</span>
                      )}

                      <h3>{m.rutina.rutina.nombre}</h3>
                      {m.rutina.rutina.objetivo && (
                        <p className="rutina-objetivo">🎯 {m.rutina.rutina.objetivo}</p>
                      )}
                      <p className="rutina-desc">{m.rutina.rutina.descripcion}</p>
                      <p className="rutina-meta">
                        {m.rutina.rutina.dias_por_semana} días/semana ·{' '}
                        {m.rutina.rutina.duracion_minutos} min por sesión
                      </p>

                      {m.rutina.rutina.calentamiento && (
                        <div className="rutina-nota rutina-nota-calentamiento">
                          <strong>🔥 Calentamiento:</strong> {m.rutina.rutina.calentamiento}
                        </div>
                      )}

                      {Object.entries(agruparPorDia(m.rutina.rutina.ejercicios)).map(
                        ([dia, ejercicios]) => (
                          <div key={dia} className="dia-rutina">
                            <h4>{dia}</h4>
                            <ul>
                              {ejercicios.map((ej) => (
                                <li key={ej.id || ej.nombre}>
                                  <strong>{ej.nombre}</strong>
                                  {ej.series && ej.repeticiones && ` — ${ej.series}x${ej.repeticiones}`}
                                  {ej.duracion_segundos && ` — ${ej.duracion_segundos}s`}
                                  {ej.descanso_segundos && ` · descanso ${ej.descanso_segundos}s`}
                                  {ej.consejo && (
                                    <div className="ejercicio-consejo">💡 {ej.consejo}</div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      )}

                      {m.rutina.rutina.enfriamiento && (
                        <div className="rutina-nota rutina-nota-enfriamiento">
                          <strong>🧘 Enfriamiento:</strong> {m.rutina.rutina.enfriamiento}
                        </div>
                      )}

                      {Array.isArray(m.rutina.rutina.consejos_generales) &&
                        m.rutina.rutina.consejos_generales.length > 0 && (
                          <div className="rutina-consejos">
                            <h4>💡 Consejos para esta rutina</h4>
                            <ul>
                              {m.rutina.rutina.consejos_generales.map((c, idx) => (
                                <li key={idx}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="msg-bubble">
                    {m.markdown ? (
                      <MarkdownAnimado
                        text={m.text}
                        enabled={m.from === 'bot' && i >= umbralAnimacion.current[chatActualId]}
                        onTick={nudgeScroll}
                      />
                    ) : m.from === 'bot' ? (
                      <TextoAnimado
                        text={m.text}
                        enabled={i >= umbralAnimacion.current[chatActualId]}
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

          {chatActual.paso === PASOS.LUGAR && (
            <div className="chat-options">
              {OPCIONES_LUGAR.map((op) => (
                <button key={op.valor} className="chat-option-btn" onClick={() => elegirLugar(op)}>
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {chatActual.paso === PASOS.EQUIPO && (
            <div className="chat-options">
              {OPCIONES_EQUIPO.map((op) => (
                <button key={op.valor} className="chat-option-btn" onClick={() => elegirEquipo(op)}>
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {chatActual.paso === PASOS.GRUPO_MUSCULAR && (
            <div className="chat-options">
              {OPCIONES_GRUPO_MUSCULAR.map((op) => (
                <button
                  key={op.valor}
                  className="chat-option-btn"
                  onClick={() => elegirGrupoMuscular(op)}
                  disabled={enviandoLibre}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {chatActual.paso === PASOS.GRUPO_MUSCULAR && (
            <form className="chat-input-row" onSubmit={enviarGrupoMuscular}>
              <input
                type="text"
                placeholder="...o escribe algo específico (ej: espalda y hombros)"
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                disabled={enviandoLibre}
              />
              <button type="submit" disabled={enviandoLibre || !textoLibre.trim()}>
                Enviar
              </button>
            </form>
          )}

          {chatActual.paso === PASOS.ERROR && (
            <div className="chat-actions">
              <button className="btn-primary" onClick={reiniciar}>
                Intentar de nuevo
              </button>
            </div>
          )}

          {chatActual.paso === PASOS.RESULTADO && (
            <div className="chat-actions">
              <button className="btn-secondary" onClick={reiniciar}>
                Generar otra rutina
              </button>
            </div>
          )}

          {chatActivo && (
            <form className="chat-input-row" onSubmit={enviarPreguntaLibre}>
              <input
                type="text"
                placeholder="Escribe tu pregunta... (ej: ¿qué hago si me duele la rodilla?)"
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
                disabled={enviandoLibre}
              />
              <button type="submit" disabled={enviandoLibre || !textoLibre.trim()}>
                Enviar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}