
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { getEmoji } from "../utils/rutinasStorage";

const GRUPO_ICONO = {
  pecho: "🏋️", espalda: "🧗", hombros: "💪", biceps: "💪",
  triceps: "💪", abdomen: "🔥", cuadriceps: "🦵", femoral: "🦵",
  gluteos: "🍑", pantorrillas: "🦵", cardio: "🏃",
  cuerpo_completo: "🏋️",
};

const GRUPO_LABEL = {
  pecho: "Pecho", espalda: "Espalda", hombros: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", abdomen: "Abdomen",
  cuadriceps: "Cuádriceps", femoral: "Femoral", gluteos: "Glúteos",
  pantorrillas: "Pantorrillas", cardio: "Cardio",
  cuerpo_completo: "Cuerpo completo",
};

function iconoEjercicio(ejercicio = {}) {
  return GRUPO_ICONO[ejercicio.grupo_muscular] || "💪";
}

function grupoLabel(grupo) {
  return GRUPO_LABEL[grupo] || grupo || "Entrenamiento";
}

function resumenRutina(rutina) {
  const ejercicios = rutina?.ejercicios_detalle || [];
  return {
    total: ejercicios.length,
    series: ejercicios.reduce(
      (sum, item) => sum + (Number(item.series) || 0), 0
    ),
  };
}

export default function RutinasPage() {
  const navigate = useNavigate();

  const [rutinas, setRutinas] = useState([]);
  const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState([]);
  const [rutinaActiva, setRutinaActiva] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [usuarioId, setUsuarioId] = useState(null);
  const [temporizador, setTemporizador] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [mostrarAgregarEjercicio, setMostrarAgregarEjercicio] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [busquedaEjercicio, setBusquedaEjercicio] = useState("");
  const [nuevoEjercicio, setNuevoEjercicio] = useState({
    ejercicio_id: "",
    series: 3,
    repeticiones: 10,
    descanso_segundos: 60,
  });

  // Estado del creador de rutinas personalizadas
  const [mostrarCreador, setMostrarCreador] = useState(false);
  const [nombreNuevaRutina, setNombreNuevaRutina] = useState("");
  const [descripcionNuevaRutina, setDescripcionNuevaRutina] = useState("");
  const [busquedaCreador, setBusquedaCreador] = useState("");
  const [ejerciciosNuevos, setEjerciciosNuevos] = useState([]);
  const [guardandoRutina, setGuardandoRutina] = useState(false);
  const [errorCreador, setErrorCreador] = useState("");

  const intervalRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    let activo = true;
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    const cargarRutinas = async () => {
      try {
        setCargando(true);

        const perfilRes = await api.get("/usuarios/me/", { headers });
        const idUsuario = perfilRes.data.id;

        if (!activo) return;
        setUsuarioId(idUsuario);

        try {
          await api.post(
            "/rutinas/generar-catalogo/",
            { usuario_id: idUsuario },
            { headers }
          );
        } catch (errorCatalogo) {
          console.error(
            "No se pudo generar el catálogo de rutinas:",
            errorCatalogo
          );
        }

        const [rutinasRes, ejerciciosRes] = await Promise.all([
          api.get(`/usuarios/${idUsuario}/rutinas/`, { headers }),
          api.get("/ejercicios/", { headers }),
        ]);

        if (!activo) return;

        const rutinasOrdenadas = Array.isArray(rutinasRes.data)
          ? [...rutinasRes.data].sort(
              (a, b) => (b.recomendada ? 1 : 0) - (a.recomendada ? 1 : 0)
            )
          : [];

        setRutinas(rutinasOrdenadas);
        setEjerciciosCatalogo(
          Array.isArray(ejerciciosRes.data) ? ejerciciosRes.data : []
        );
      } catch (error) {
        console.error("Error cargando rutinas:", error);
        if (activo) {
          setRutinas([]);
          setEjerciciosCatalogo([]);
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarRutinas();

    return () => {
      activo = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  const ejerciciosFiltrados = useMemo(() => {
    const texto = busquedaEjercicio.trim().toLowerCase();
    if (!texto) return ejerciciosCatalogo;

    return ejerciciosCatalogo.filter((ejercicio) =>
      `${ejercicio.nombre || ""} ${grupoLabel(
        ejercicio.grupo_muscular
      )}`.toLowerCase().includes(texto)
    );
  }, [ejerciciosCatalogo, busquedaEjercicio]);

  const ejercicioSeleccionado = useMemo(
    () => ejerciciosCatalogo.find(
      (e) => String(e.id) === String(nuevoEjercicio.ejercicio_id)
    ),
    [ejerciciosCatalogo, nuevoEjercicio.ejercicio_id]
  );

  const ejerciciosDisponiblesCreador = useMemo(() => {
    const texto = busquedaCreador.trim().toLowerCase();
    if (!texto) return ejerciciosCatalogo;

    return ejerciciosCatalogo.filter((ejercicio) =>
      `${ejercicio.nombre || ""} ${grupoLabel(
        ejercicio.grupo_muscular
      )}`.toLowerCase().includes(texto)
    );
  }, [ejerciciosCatalogo, busquedaCreador]);

  const toggleFavorita = (id) => {
    api.patch(
      `/usuarios/${usuarioId}/rutinas/${id}/favorita/`,
      {},
      { headers }
    )
      .then((res) => {
        setRutinas((actuales) => actuales.map((r) =>
          r.id === id
            ? { ...r, es_favorita: res.data.es_favorita }
            : r
        ));
        setRutinaActiva((actual) =>
          actual?.id === id
            ? { ...actual, es_favorita: res.data.es_favorita }
            : actual
        );
      })
      .catch((error) => console.error("Error actualizando favorita:", error));
  };

  const eliminarRutina = (id) => {
    if (!window.confirm("¿Eliminar esta rutina?")) return;

    api.delete(`/usuarios/${usuarioId}/rutinas/${id}/`, { headers })
      .then(() => {
        setRutinas((actuales) => actuales.filter((r) => r.id !== id));
        if (rutinaActiva?.id === id) setRutinaActiva(null);
      })
      .catch((error) => console.error("Error eliminando rutina:", error));
  };

  const seleccionarRutina = (rutina) => {
    setRutinaActiva((actual) =>
      actual?.id === rutina.id ? null : rutina
    );
    setMostrarAgregarEjercicio(false);
    setSelectorAbierto(false);
  };

  const agregarEjercicio = async () => {
    if (!nuevoEjercicio.ejercicio_id || !rutinaActiva) return;

    try {
      const res = await api.post(
        `/usuarios/${usuarioId}/rutinas/${rutinaActiva.id}/ejercicios/`,
        {
          ...nuevoEjercicio,
          ejercicio_id: Number(nuevoEjercicio.ejercicio_id),
          series: Number(nuevoEjercicio.series),
          repeticiones: Number(nuevoEjercicio.repeticiones),
          descanso_segundos: Number(nuevoEjercicio.descanso_segundos),
        },
        { headers }
      );

      const detalle = { ...res.data, ejercicio: ejercicioSeleccionado };
      const actualizada = {
        ...rutinaActiva,
        ejercicios_detalle: [
          ...(rutinaActiva.ejercicios_detalle || []),
          detalle,
        ],
      };

      setRutinaActiva(actualizada);
      setRutinas((actuales) => actuales.map((r) =>
        r.id === actualizada.id ? actualizada : r
      ));
      setMostrarAgregarEjercicio(false);
      setSelectorAbierto(false);
      setBusquedaEjercicio("");
      setNuevoEjercicio({
        ejercicio_id: "",
        series: 3,
        repeticiones: 10,
        descanso_segundos: 60,
      });
    } catch (error) {
      console.error("Error agregando ejercicio:", error);
      window.alert(
        error.response?.data?.detail ||
        "No se pudo agregar el ejercicio."
      );
    }
  };

  const alternarEjercicioNuevo = (ejercicio) => {
    setErrorCreador("");

    setEjerciciosNuevos((actuales) => {
      const existe = actuales.some(
        (item) => String(item.ejercicio_id) === String(ejercicio.id)
      );

      if (existe) {
        return actuales.filter(
          (item) => String(item.ejercicio_id) !== String(ejercicio.id)
        );
      }

      return [
        ...actuales,
        {
          ejercicio_id: String(ejercicio.id),
          series: 3,
          repeticiones: 10,
          descanso_segundos: 60,
        },
      ];
    });
  };

  const actualizarEjercicioNuevo = (ejercicioId, campo, valor) => {
    setEjerciciosNuevos((actuales) => actuales.map((item) =>
      String(item.ejercicio_id) === String(ejercicioId)
        ? { ...item, [campo]: valor }
        : item
    ));
  };

  const reiniciarCreador = () => {
    setNombreNuevaRutina("");
    setDescripcionNuevaRutina("");
    setBusquedaCreador("");
    setEjerciciosNuevos([]);
    setErrorCreador("");
  };

  const crearRutinaPersonalizada = async () => {
    if (!usuarioId) {
      setErrorCreador("No se pudo identificar tu usuario. Recarga la página.");
      return;
    }

    if (!nombreNuevaRutina.trim()) {
      setErrorCreador("Escribe un nombre para tu rutina.");
      return;
    }

    if (ejerciciosNuevos.length === 0) {
      setErrorCreador("Selecciona al menos un ejercicio.");
      return;
    }

    const invalido = ejerciciosNuevos.some((item) =>
      !Number.isInteger(Number(item.series)) ||
      Number(item.series) < 1 ||
      !Number.isInteger(Number(item.repeticiones)) ||
      Number(item.repeticiones) < 1 ||
      !Number.isInteger(Number(item.descanso_segundos)) ||
      Number(item.descanso_segundos) < 0
    );

    if (invalido) {
      setErrorCreador("Revisa las series, repeticiones y descansos.");
      return;
    }

    setGuardandoRutina(true);
    setErrorCreador("");

    try {
      const respuesta = await api.post(
        `/usuarios/${usuarioId}/rutinas/`,
        {
          nombre: nombreNuevaRutina.trim(),
          descripcion: descripcionNuevaRutina.trim(),
        },
        { headers }
      );

      const rutinaCreada = respuesta.data;
      const rutinaId = rutinaCreada.id;

      if (!rutinaId) {
        throw new Error("El servidor no devolvió el ID de la rutina.");
      }

      // Se añaden los ejercicios uno por uno y se conserva su orden.
      for (let i = 0; i < ejerciciosNuevos.length; i += 1) {
        const item = ejerciciosNuevos[i];

        await api.post(
          `/usuarios/${usuarioId}/rutinas/${rutinaId}/ejercicios/`,
          {
            ejercicio_id: Number(item.ejercicio_id),
            series: Number(item.series),
            repeticiones: Number(item.repeticiones),
            descanso_segundos: Number(item.descanso_segundos),
            orden: i + 1,
          },
          { headers }
        );
      }

      const respuestaRutinas = await api.get(
        `/usuarios/${usuarioId}/rutinas/`,
        { headers }
      );

      const actualizadas = Array.isArray(respuestaRutinas.data)
        ? [...respuestaRutinas.data].sort(
            (a, b) => (b.recomendada ? 1 : 0) - (a.recomendada ? 1 : 0)
          )
        : [];

      setRutinas(actualizadas);

      const completa = actualizadas.find(
        (r) => String(r.id) === String(rutinaId)
      );

      setRutinaActiva(completa || rutinaCreada);
      setMostrarCreador(false);
      reiniciarCreador();
    } catch (error) {
      console.error("Error creando la rutina:", error);
      setErrorCreador(
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "No se pudo guardar la rutina. Comprueba la conexión con Django."
      );
    } finally {
      setGuardandoRutina(false);
    }
  };

  const iniciarTemporizador = (segundos) => {
    clearInterval(intervalRef.current);
    const inicial = Math.max(0, Number(segundos) || 0);
    setTiempoRestante(inicial);
    setTemporizador(inicial);

    intervalRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTemporizador(null);
          return 0;
        }
        setTemporizador(prev - 1);
        return prev - 1;
      });
    }, 1000);
  };

  const formatTiempo = (s) =>
    `${Math.floor((Number(s) || 0) / 60)}:${String(
      (Number(s) || 0) % 60
    ).padStart(2, "0")}`;

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <div style={styles.container}>
          <button
            onClick={() => navigate("/rutinas/entrenamiento")}
            style={styles.emptyWorkoutButton}
          >
            <span style={styles.emptyWorkoutIcon}>⚡</span>
            <span>
              <strong style={{ display: "block", color: "#fff" }}>
                Empezar entrenamiento
              </strong>
              <small style={{ color: "#a1a1aa" }}>
                Comienza desde cero y añade ejercicios
              </small>
            </span>
            <span style={styles.arrow}>→</span>
          </button>

          <header style={styles.header}>
            <div>
              <div style={styles.eyebrow}>TU ENTRENAMIENTO</div>
              <h1 style={styles.title}>
                Mis <span>Rutinas</span>
              </h1>
              <p style={styles.subtitle}>
                Organiza tus ejercicios y ten tu entrenamiento listo para empezar.
              </p>
            </div>

            <div style={styles.catalogReadyBadge}>
              <span style={styles.catalogReadyDot}></span>
              Catálogo automático
            </div>
          </header>

          {/* CREADOR DE RUTINAS PERSONALIZADAS */}
          <section style={styles.creatorSection}>
            <div style={styles.creatorIntro}>
              <div>
                <div style={styles.eyebrow}>A TU MANERA</div>
                <h2 style={styles.creatorTitle}>Crea tu rutina</h2>
                <p style={styles.creatorDescription}>
                  Elige tus ejercicios y configura tu entrenamiento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarCreador((actual) => !actual);
                  setErrorCreador("");
                }}
                style={styles.createRoutineButton}
              >
                {mostrarCreador ? "Cerrar ×" : "＋ Crear rutina"}
              </button>
            </div>

            {mostrarCreador && (
              <div style={styles.creatorForm}>
                <label style={styles.label} htmlFor="nombre-nueva-rutina">
                  Nombre de la rutina
                </label>
                <input
                  id="nombre-nueva-rutina"
                  type="text"
                  maxLength={100}
                  value={nombreNuevaRutina}
                  onChange={(e) => setNombreNuevaRutina(e.target.value)}
                  placeholder="Ej. Pecho y tríceps"
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="descripcion-nueva-rutina">
                  Descripción (opcional)
                </label>
                <textarea
                  id="descripcion-nueva-rutina"
                  maxLength={500}
                  value={descripcionNuevaRutina}
                  onChange={(e) => setDescripcionNuevaRutina(e.target.value)}
                  placeholder="Describe tu entrenamiento..."
                  rows={3}
                  style={styles.creatorTextarea}
                />

                <div style={styles.creatorExerciseHeading}>
                  <div>
                    <h3 style={styles.creatorSubtitle}>
                      Selecciona los ejercicios
                    </h3>
                    <p style={styles.creatorDescription}>
                      {ejerciciosNuevos.length} seleccionado(s)
                    </p>
                  </div>
                </div>

                <input
                  type="search"
                  value={busquedaCreador}
                  onChange={(e) => setBusquedaCreador(e.target.value)}
                  placeholder="Buscar ejercicio o grupo muscular..."
                  style={styles.input}
                />

                <div style={styles.creatorCatalog}>
                  {ejerciciosDisponiblesCreador.length === 0 ? (
                    <div style={styles.noExercises}>
                      No se encontraron ejercicios.
                    </div>
                  ) : (
                    ejerciciosDisponiblesCreador.map((ejercicio) => {
                      const seleccionado = ejerciciosNuevos.some(
                        (item) =>
                          String(item.ejercicio_id) === String(ejercicio.id)
                      );

                      return (
                        <button
                          type="button"
                          key={ejercicio.id}
                          onClick={() => alternarEjercicioNuevo(ejercicio)}
                          style={styles.creatorExerciseOption(seleccionado)}
                        >
                          <span style={styles.creatorExerciseIcon}>
                            {iconoEjercicio(ejercicio)}
                          </span>
                          <span style={styles.creatorExerciseText}>
                            <strong>{ejercicio.nombre}</strong>
                            <small>
                              {grupoLabel(ejercicio.grupo_muscular)}
                            </small>
                          </span>
                          <span style={styles.creatorCheck}>
                            {seleccionado ? "✓" : "+"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {ejerciciosNuevos.length > 0 && (
                  <div style={styles.creatorConfigurations}>
                    <h3 style={styles.creatorSubtitle}>
                      Configura cada ejercicio
                    </h3>

                    {ejerciciosNuevos.map((item) => {
                      const ejercicio = ejerciciosCatalogo.find(
                        (e) => String(e.id) === String(item.ejercicio_id)
                      );

                      return (
                        <div
                          key={item.ejercicio_id}
                          style={styles.creatorConfigCard}
                        >
                          <div style={styles.creatorConfigHeading}>
                            <strong>
                              {ejercicio?.nombre || "Ejercicio"}
                            </strong>
                            <button
                              type="button"
                              onClick={() =>
                                alternarEjercicioNuevo({
                                  id: item.ejercicio_id,
                                })
                              }
                              style={styles.creatorRemoveButton}
                            >
                              Quitar ×
                            </button>
                          </div>

                          <div style={styles.formGrid}>
                            <div>
                              <label
                                style={styles.label}
                                htmlFor={`series-${item.ejercicio_id}`}
                              >
                                Series
                              </label>
                              <input
                                id={`series-${item.ejercicio_id}`}
                                type="number"
                                min="1"
                                step="1"
                                value={item.series}
                                onChange={(e) =>
                                  actualizarEjercicioNuevo(
                                    item.ejercicio_id,
                                    "series",
                                    e.target.value
                                  )
                                }
                                style={styles.smallInput}
                              />
                            </div>

                            <div>
                              <label
                                style={styles.label}
                                htmlFor={`reps-${item.ejercicio_id}`}
                              >
                                Repeticiones
                              </label>
                              <input
                                id={`reps-${item.ejercicio_id}`}
                                type="number"
                                min="1"
                                step="1"
                                value={item.repeticiones}
                                onChange={(e) =>
                                  actualizarEjercicioNuevo(
                                    item.ejercicio_id,
                                    "repeticiones",
                                    e.target.value
                                  )
                                }
                                style={styles.smallInput}
                              />
                            </div>

                            <div>
                              <label
                                style={styles.label}
                                htmlFor={`descanso-${item.ejercicio_id}`}
                              >
                                Descanso (s)
                              </label>
                              <input
                                id={`descanso-${item.ejercicio_id}`}
                                type="number"
                                min="0"
                                step="1"
                                value={item.descanso_segundos}
                                onChange={(e) =>
                                  actualizarEjercicioNuevo(
                                    item.ejercicio_id,
                                    "descanso_segundos",
                                    e.target.value
                                  )
                                }
                                style={styles.smallInput}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {errorCreador && (
                  <p role="alert" style={styles.creatorError}>
                    {errorCreador}
                  </p>
                )}

                <div style={styles.formActions}>
                  <button
                    type="button"
                    onClick={crearRutinaPersonalizada}
                    disabled={guardandoRutina}
                    style={{
                      ...styles.primaryButton,
                      opacity: guardandoRutina ? 0.6 : 1,
                      cursor: guardandoRutina ? "wait" : "pointer",
                    }}
                  >
                    {guardandoRutina ? "Guardando..." : "Guardar rutina"}
                  </button>

                  <button
                    type="button"
                    disabled={guardandoRutina}
                    onClick={() => {
                      setMostrarCreador(false);
                      setErrorCreador("");
                    }}
                    style={styles.secondaryButton}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {temporizador !== null && (
            <div style={styles.timerCard}>
              <div>
                <span style={styles.timerLabel}>DESCANSO</span>
                <div style={styles.timer}>{formatTiempo(tiempoRestante)}</div>
              </div>
              <button
                onClick={() => {
                  clearInterval(intervalRef.current);
                  setTemporizador(null);
                }}
                style={styles.secondaryButton}
              >
                Terminar
              </button>
            </div>
          )}

          {cargando && (
            <div style={styles.emptyState}>Cargando tus rutinas...</div>
          )}

          {!cargando && rutinas.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🏋️</div>
              <h3 style={{ margin: "0 0 0.4rem", color: "#e4e4e7" }}>
                Aún no tienes rutinas
              </h3>
              <p style={{ margin: 0 }}>
                Puedes crear tu primera rutina con el botón de arriba.
              </p>
            </div>
          )}

          {!cargando && rutinas.length > 0 && (
            <div style={styles.layout(!!rutinaActiva)}>
              <div style={styles.routinesGrid(!!rutinaActiva)}>
                {rutinas.map((r) => {
                  const resumen = resumenRutina(r);
                  const primerEjercicio = r.ejercicios_detalle?.[0]?.ejercicio;
                  const icono = primerEjercicio
                    ? iconoEjercicio(primerEjercicio)
                    : getEmoji(r.id);
                  const grupo = primerEjercicio
                    ? grupoLabel(primerEjercicio.grupo_muscular)
                    : "Lista para entrenar";
                  const activa = rutinaActiva?.id === r.id;

                  return (
                    <article
                      key={r.id}
                      onClick={() => seleccionarRutina(r)}
                      style={styles.routineCard(activa)}
                    >
                      <div style={styles.cardTop}>
                        <div style={styles.exerciseTile(activa)}>{icono}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.cardKicker}>{grupo}</div>
                          <h3 style={styles.cardTitle}>{r.nombre}</h3>
                          {r.recomendada && (
                            <span style={styles.recomendadaBadge}>
                              ★ Recomendada para ti
                            </span>
                          )}
                        </div>

                        <div style={styles.cardButtons}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorita(r.id);
                            }}
                            style={styles.iconButton}
                            aria-label="Favorita"
                          >
                            {r.es_favorita ? "★" : "☆"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarRutina(r.id);
                            }}
                            style={styles.deleteButton}
                            aria-label="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <p style={styles.cardDescription}>
                        {r.descripcion || "Tu entrenamiento personalizado"}
                      </p>

                      <div style={styles.cardStats}>
                        <span>
                          🏋️ {resumen.total} ejercicio
                          {resumen.total === 1 ? "" : "s"}
                        </span>
                        <span>▦ {resumen.series} series</span>
                      </div>

                      <div style={styles.cardFooter}>
                        <span>
                          {activa ? "Rutina abierta" : "Toca para ver detalle"}
                        </span>
                        <span style={styles.cardArrow}>→</span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {rutinaActiva && (
                <aside style={styles.detailCard}>
                  <div style={styles.detailHeader}>
                    <div>
                      <div style={styles.eyebrow}>RUTINA ACTIVA</div>
                      <h2 style={styles.detailTitle}>{rutinaActiva.nombre}</h2>
                    </div>
                    <button
                      onClick={() =>
                        navigate("/rutinas/entrenamiento", {
                          state: { rutina: rutinaActiva },
                        })
                      }
                      style={styles.startButton}
                    >
                      ▶ Empezar
                    </button>
                  </div>

                  <p style={styles.detailDescription}>
                    {rutinaActiva.descripcion ||
                      "Añade ejercicios para construir tu entrenamiento."}
                  </p>

                  <button
                    onClick={() => {
                      setMostrarAgregarEjercicio((v) => !v);
                      setSelectorAbierto(false);
                    }}
                    style={styles.addExerciseButton}
                  >
                    ＋ Añadir ejercicio
                  </button>

                  {mostrarAgregarEjercicio && (
                    <div style={styles.addPanel}>
                      <label style={styles.label}>Ejercicio</label>

                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectorAbierto((v) => !v);
                            setBusquedaEjercicio("");
                          }}
                          style={styles.customSelect}
                        >
                          <span style={styles.selectedExercise}>
                            <span style={styles.selectedExerciseIcon}>
                              {ejercicioSeleccionado
                                ? iconoEjercicio(ejercicioSeleccionado)
                                : "🏋️"}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <strong style={styles.selectedExerciseName}>
                                {ejercicioSeleccionado?.nombre ||
                                  "Elegir ejercicio"}
                              </strong>
                              <small style={styles.selectedExerciseHint}>
                                {ejercicioSeleccionado
                                  ? grupoLabel(
                                      ejercicioSeleccionado.grupo_muscular
                                    )
                                  : "Selecciona un ejercicio"}
                              </small>
                            </span>
                          </span>
                          <span
                            style={{
                              ...styles.selectChevron,
                              transform: selectorAbierto
                                ? "rotate(180deg)"
                                : "none",
                            }}
                          >
                            ⌄
                          </span>
                        </button>

                        {selectorAbierto && (
                          <div style={styles.optionMenu}>
                            <div style={styles.optionSearchWrap}>
                              <span style={styles.searchIcon}>⌕</span>
                              <input
                                autoFocus
                                value={busquedaEjercicio}
                                onChange={(e) =>
                                  setBusquedaEjercicio(e.target.value)
                                }
                                placeholder="Buscar ejercicio..."
                                style={styles.optionSearch}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            <div style={styles.optionHeader}>
                              <span>
                                {ejerciciosFiltrados.length} ejercicios
                              </span>
                              <span>Selecciona uno</span>
                            </div>

                            <div style={styles.optionList}>
                              {ejerciciosFiltrados.length === 0 ? (
                                <div style={styles.noExerciseFound}>
                                  No encontramos ese ejercicio.
                                </div>
                              ) : (
                                ejerciciosFiltrados.map((ejercicio) => {
                                  const seleccionado =
                                    String(ejercicio.id) ===
                                    String(nuevoEjercicio.ejercicio_id);

                                  return (
                                    <button
                                      key={ejercicio.id}
                                      type="button"
                                      onClick={() => {
                                        setNuevoEjercicio({
                                          ...nuevoEjercicio,
                                          ejercicio_id: String(ejercicio.id),
                                        });
                                        setSelectorAbierto(false);
                                        setBusquedaEjercicio("");
                                      }}
                                      style={styles.optionButton(seleccionado)}
                                    >
                                      <span style={styles.optionIcon}>
                                        {iconoEjercicio(ejercicio)}
                                      </span>
                                      <span style={styles.optionText}>
                                        <strong>{ejercicio.nombre}</strong>
                                        <small>
                                          {grupoLabel(
                                            ejercicio.grupo_muscular
                                          )}
                                        </small>
                                      </span>
                                      {seleccionado && (
                                        <span style={styles.optionCheck}>✓</span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={styles.formGrid}>
                        <div>
                          <label style={styles.label}>Series</label>
                          <input
                            type="number"
                            min="1"
                            value={nuevoEjercicio.series}
                            onChange={(e) =>
                              setNuevoEjercicio({
                                ...nuevoEjercicio,
                                series: Number(e.target.value),
                              })
                            }
                            style={styles.smallInput}
                          />
                        </div>
                        <div>
                          <label style={styles.label}>Repeticiones</label>
                          <input
                            type="number"
                            min="1"
                            value={nuevoEjercicio.repeticiones}
                            onChange={(e) =>
                              setNuevoEjercicio({
                                ...nuevoEjercicio,
                                repeticiones: Number(e.target.value),
                              })
                            }
                            style={styles.smallInput}
                          />
                        </div>
                        <div>
                          <label style={styles.label}>Descanso (seg)</label>
                          <input
                            type="number"
                            min="0"
                            value={nuevoEjercicio.descanso_segundos}
                            onChange={(e) =>
                              setNuevoEjercicio({
                                ...nuevoEjercicio,
                                descanso_segundos: Number(e.target.value),
                              })
                            }
                            style={styles.smallInput}
                          />
                        </div>
                      </div>

                      <div style={styles.formActions}>
                        <button
                          onClick={agregarEjercicio}
                          disabled={!ejercicioSeleccionado}
                          style={{
                            ...styles.primaryButton,
                            opacity: ejercicioSeleccionado ? 1 : 0.45,
                          }}
                        >
                          Agregar
                        </button>
                        <button
                          onClick={() => setMostrarAgregarEjercicio(false)}
                          style={styles.secondaryButton}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "1.2rem" }}>
                    {(rutinaActiva.ejercicios_detalle || []).length === 0 ? (
                      <div style={styles.noExercises}>
                        Aún no hay ejercicios. Añade uno para empezar.
                      </div>
                    ) : (
                      rutinaActiva.ejercicios_detalle.map((re, idx) => (
                        <div key={re.id || idx} style={styles.exerciseRow}>
                          <div style={styles.exerciseRowIcon}>
                            {iconoEjercicio(re.ejercicio)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={styles.exerciseName}>
                              {re.ejercicio?.nombre || "Ejercicio"}
                            </strong>
                            <span style={styles.exerciseMeta}>
                              {grupoLabel(re.ejercicio?.grupo_muscular)} ·{" "}
                              {re.series} series · {re.repeticiones} reps
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              iniciarTemporizador(re.descanso_segundos)
                            }
                            style={styles.restButton}
                          >
                            ⏱ {formatTiempo(re.descanso_segundos)}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 10% 0%, rgba(168,85,247,.16), transparent 30%), linear-gradient(135deg,#0b0912 0%,#160d24 55%,#0c0913 100%)",
    padding: "6rem 1.25rem 3rem",
    color: "#fff",
    boxSizing: "border-box",
  },
  container: { maxWidth: "1180px", margin: "0 auto" },
  emptyWorkoutButton: {
    width: "100%", display: "flex", alignItems: "center", gap: ".9rem",
    textAlign: "left",
    background: "linear-gradient(135deg,rgba(168,85,247,.14),rgba(236,72,153,.08))",
    border: "1px solid rgba(192,132,252,.25)", borderRadius: "18px",
    padding: "1rem 1.2rem", cursor: "pointer", marginBottom: "2.2rem",
  },
  emptyWorkoutIcon: {
    width: "42px", height: "42px", display: "grid", placeItems: "center",
    borderRadius: "12px", background: "rgba(168,85,247,.18)", fontSize: "1.2rem",
  },
  arrow: { marginLeft: "auto", color: "#c084fc", fontSize: "1.3rem" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    flexWrap: "wrap", gap: "1rem", marginBottom: "1.8rem",
  },
  catalogReadyBadge: {
    display: "inline-flex", alignItems: "center", gap: ".45rem",
    color: "#d8b4fe", background: "rgba(168,85,247,.09)",
    border: "1px solid rgba(192,132,252,.2)", borderRadius: "999px",
    padding: ".5rem .75rem", fontSize: ".72rem", fontWeight: 800,
  },
  catalogReadyDot: {
    width: "7px", height: "7px", borderRadius: "50%", background: "#c084fc",
    boxShadow: "0 0 10px rgba(192,132,252,.7)",
  },
  eyebrow: {
    color: "#a78bfa", fontSize: ".7rem", letterSpacing: ".16em",
    fontWeight: 900, marginBottom: ".4rem",
  },
  title: {
    fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1, margin: 0,
    fontWeight: 900, letterSpacing: "-.04em",
  },
  subtitle: { color: "#a1a1aa", margin: ".65rem 0 0", maxWidth: "600px" },
  primaryButton: {
    background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "#fff",
    border: "none", padding: ".78rem 1.1rem", borderRadius: "12px",
    cursor: "pointer", fontWeight: 800,
    boxShadow: "0 10px 30px rgba(168,85,247,.18)",
  },
  secondaryButton: {
    background: "rgba(255,255,255,.04)", color: "#d4d4d8",
    border: "1px solid rgba(255,255,255,.12)", padding: ".72rem 1rem",
    borderRadius: "11px", cursor: "pointer", fontWeight: 700,
  },
  timerCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "rgba(168,85,247,.1)", border: "1px solid rgba(192,132,252,.25)",
    borderRadius: "16px", padding: "1rem 1.2rem", marginBottom: "1.5rem",
  },
  timerLabel: { color: "#c084fc", fontSize: ".8rem", fontWeight: 800 },
  timer: { fontSize: "2.1rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" },
  input: {
    width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,.25)",
    color: "#fff", border: "1px solid rgba(192,132,252,.2)",
    borderRadius: "12px", padding: ".85rem .95rem", marginBottom: ".75rem",
    outline: "none",
  },
  label: {
    display: "block", color: "#a1a1aa", fontSize: ".72rem",
    fontWeight: 800, marginBottom: ".35rem",
  },
  formActions: {
    display: "flex", gap: ".65rem", flexWrap: "wrap", marginTop: ".8rem",
  },
  emptyState: {
    textAlign: "center", color: "#71717a", padding: "4rem 1rem",
    background: "rgba(255,255,255,.025)",
    border: "1px dashed rgba(255,255,255,.1)", borderRadius: "20px",
  },
  emptyIcon: { fontSize: "3rem", marginBottom: ".8rem" },
  layout: (active) => ({
    display: "grid",
    gridTemplateColumns: active ? "minmax(0,1fr) minmax(320px,430px)" : "1fr",
    gap: "1.2rem", alignItems: "start",
  }),
  routinesGrid: (active) => ({
    display: "grid",
    gridTemplateColumns: active ? "1fr" : "repeat(auto-fill,minmax(290px,1fr))",
    gap: "1rem",
  }),
  routineCard: (active) => ({
    background: active
      ? "linear-gradient(145deg,rgba(168,85,247,.17),rgba(236,72,153,.07))"
      : "rgba(255,255,255,.045)",
    border: `1px solid ${active ? "rgba(192,132,252,.55)" : "rgba(192,132,252,.14)"}`,
    borderRadius: "20px", padding: "1.05rem", cursor: "pointer",
    transition: "transform .2s ease, border .2s ease, background .2s ease",
    boxShadow: active ? "0 18px 45px rgba(0,0,0,.2)" : "none",
  }),
  cardTop: { display: "flex", alignItems: "center", gap: ".75rem" },
  exerciseTile: (active) => ({
    width: "58px", height: "58px", flex: "0 0 58px", display: "grid",
    placeItems: "center", borderRadius: "16px",
    background: active
      ? "linear-gradient(135deg,#a855f7,#ec4899)"
      : "linear-gradient(135deg,rgba(168,85,247,.2),rgba(236,72,153,.12))",
    border: "1px solid rgba(255,255,255,.1)", fontSize: "1.7rem",
    boxShadow: active ? "0 8px 22px rgba(168,85,247,.25)" : "none",
  }),
  cardKicker: {
    color: "#a78bfa", fontSize: ".68rem", fontWeight: 900,
    textTransform: "uppercase", letterSpacing: ".08em",
  },
  recomendadaBadge: {
    display: "inline-flex", alignItems: "center", gap: ".3rem",
    color: "#86efac", background: "rgba(74,222,128,.12)",
    border: "1px solid rgba(74,222,128,.3)", borderRadius: "999px",
    padding: ".18rem .55rem", fontSize: ".64rem", fontWeight: 800,
    textTransform: "uppercase", letterSpacing: ".04em", marginTop: ".3rem",
  },
  cardTitle: {
    margin: ".18rem 0 0", fontSize: "1.1rem", fontWeight: 850,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  cardButtons: { display: "flex", gap: ".35rem" },
  iconButton: {
    background: "transparent", border: "none", color: "#facc15",
    fontSize: "1.35rem", cursor: "pointer", padding: ".2rem",
  },
  deleteButton: {
    width: "30px", height: "30px", borderRadius: "9px",
    background: "rgba(239,68,68,.08)", color: "#f87171",
    border: "1px solid rgba(239,68,68,.2)", cursor: "pointer", fontSize: "1.1rem",
  },
  cardDescription: {
    color: "#a1a1aa", fontSize: ".84rem", lineHeight: 1.45,
    minHeight: "2.4em", margin: ".9rem 0",
  },
  cardStats: { display: "flex", gap: ".5rem", flexWrap: "wrap", color: "#d4d4d8", fontSize: ".82rem" },
  cardFooter: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: ".9rem", paddingTop: ".75rem",
    borderTop: "1px solid rgba(255,255,255,.07)",
    color: "#71717a", fontSize: ".76rem",
  },
  cardArrow: { color: "#c084fc", fontSize: "1.1rem" },
  detailCard: {
    position: "sticky", top: "5.5rem", background: "rgba(18,13,28,.88)",
    backdropFilter: "blur(14px)", border: "1px solid rgba(192,132,252,.2)",
    borderRadius: "20px", padding: "1.2rem", minWidth: 0,
  },
  detailHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: ".8rem",
  },
  detailTitle: { margin: 0, fontSize: "1.5rem", fontWeight: 900 },
  startButton: {
    background: "rgba(168,85,247,.16)", color: "#d8b4fe",
    border: "1px solid rgba(192,132,252,.28)", padding: ".65rem .8rem",
    borderRadius: "11px", cursor: "pointer", fontWeight: 800,
  },
  detailDescription: { color: "#a1a1aa", fontSize: ".85rem", lineHeight: 1.5 },
  addExerciseButton: {
    width: "100%", background: "linear-gradient(135deg,rgba(168,85,247,.18),rgba(236,72,153,.1))",
    color: "#e9d5ff", border: "1px solid rgba(192,132,252,.25)",
    padding: ".8rem", borderRadius: "12px", cursor: "pointer", fontWeight: 800,
  },
  addPanel: {
    marginTop: ".75rem", padding: ".9rem", borderRadius: "14px",
    background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.08)",
  },
  customSelect: {
    width: "100%", minHeight: "64px", display: "flex",
    justifyContent: "space-between", alignItems: "center", gap: ".75rem",
    background: "linear-gradient(135deg,rgba(28,18,40,.98),rgba(19,13,29,.98))",
    color: "#f4f4f5", border: "1px solid rgba(192,132,252,.28)",
    borderRadius: "14px", padding: ".65rem .75rem", cursor: "pointer",
    textAlign: "left", boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 10px 24px rgba(0,0,0,.18)",
  },
  selectedExercise: { display: "flex", alignItems: "center", gap: ".7rem", minWidth: 0 },
  selectedExerciseIcon: {
    width: "42px", height: "42px", flex: "0 0 42px",
    display: "grid", placeItems: "center", borderRadius: "12px",
    background: "linear-gradient(135deg,rgba(168,85,247,.24),rgba(236,72,153,.16))",
    border: "1px solid rgba(255,255,255,.08)", fontSize: "1.25rem",
  },
  selectedExerciseName: {
    display: "block", color: "#fff", fontSize: ".92rem",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  selectedExerciseHint: { display: "block", color: "#8f8a99", fontSize: ".72rem", marginTop: ".15rem" },
  selectChevron: { color: "#c084fc", fontSize: "1.2rem", transition: "transform .2s ease", paddingRight: ".15rem" },
  optionMenu: {
    position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 8px)",
    background: "linear-gradient(180deg,#1d1428,#130d1d)",
    border: "1px solid rgba(192,132,252,.3)", borderRadius: "16px",
    padding: ".55rem", boxShadow: "0 24px 60px rgba(0,0,0,.55)",
    overflow: "hidden",
  },
  optionSearchWrap: {
    display: "flex", alignItems: "center", gap: ".5rem",
    background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "11px", padding: ".05rem .65rem", marginBottom: ".5rem",
  },
  searchIcon: { color: "#c084fc", fontSize: "1.1rem" },
  optionSearch: { width: "100%", background: "transparent", color: "#fff", border: "none", outline: "none", padding: ".62rem 0", fontSize: ".82rem" },
  optionHeader: {
    display: "flex", justifyContent: "space-between", color: "#77717f",
    fontSize: ".65rem", fontWeight: 800, textTransform: "uppercase",
    letterSpacing: ".07em", padding: ".25rem .35rem .45rem",
  },
  optionList: { maxHeight: "270px", overflowY: "auto", paddingRight: ".1rem" },
  optionButton: (selected) => ({
    width: "100%", display: "flex", alignItems: "center", gap: ".7rem",
    background: selected ? "linear-gradient(90deg,rgba(168,85,247,.2),rgba(236,72,153,.08))" : "transparent",
    color: "#f4f4f5",
    border: selected ? "1px solid rgba(192,132,252,.2)" : "1px solid transparent",
    borderRadius: "11px", padding: ".62rem .55rem",
    cursor: "pointer", textAlign: "left", marginBottom: ".15rem",
  }),
  optionIcon: {
    width: "38px", height: "38px", flex: "0 0 38px",
    display: "grid", placeItems: "center", borderRadius: "11px",
    background: "rgba(168,85,247,.12)",
    border: "1px solid rgba(255,255,255,.06)", fontSize: "1.15rem",
  },
  optionText: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: ".18rem" },
  optionCheck: { color: "#d8b4fe", fontWeight: 900, fontSize: "1rem", paddingRight: ".25rem" },
  noExerciseFound: { textAlign: "center", color: "#8f8a99", padding: "1.2rem .6rem", fontSize: ".8rem" },
  formGrid: {
    display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: ".55rem", marginTop: ".8rem",
  },
  smallInput: {
    width: "100%", minWidth: 0, boxSizing: "border-box",
    background: "#17111f", color: "#fff",
    border: "1px solid rgba(192,132,252,.18)", borderRadius: "10px",
    padding: ".65rem .35rem", textAlign: "center",
  },
  noExercises: {
    color: "#71717a", textAlign: "center", padding: "1.2rem .6rem",
    border: "1px dashed rgba(255,255,255,.09)", borderRadius: "12px", fontSize: ".82rem",
  },
  exerciseRow: {
    display: "flex", alignItems: "center", gap: ".65rem",
    padding: ".7rem 0", borderBottom: "1px solid rgba(255,255,255,.06)",
  },
  exerciseRowIcon: {
    width: "40px", height: "40px", flex: "0 0 40px",
    display: "grid", placeItems: "center", borderRadius: "11px",
    background: "rgba(168,85,247,.12)", fontSize: "1.2rem",
  },
  exerciseName: { display: "block", color: "#f4f4f5" },
  exerciseMeta: { color: "#71717a", fontSize: ".78rem" },
  restButton: {
    background: "rgba(168,85,247,.08)", color: "#c4b5fd",
    border: "1px solid rgba(168,85,247,.18)", borderRadius: "9px",
    padding: ".45rem .55rem", cursor: "pointer", whiteSpace: "nowrap", fontSize: ".72rem",
  },

  // Estilos del creador: añadidos sin eliminar los estilos anteriores
  creatorSection: {
    background: "rgba(255,255,255,.035)",
    border: "1px solid rgba(192,132,252,.2)",
    borderRadius: "20px",
    padding: "1.2rem",
    marginBottom: "1.8rem",
    boxSizing: "border-box",
  },
  creatorIntro: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", flexWrap: "wrap", gap: "1rem",
  },
  creatorTitle: { margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#f4f4f5" },
  creatorDescription: { color: "#a1a1aa", fontSize: ".84rem", lineHeight: 1.5, margin: ".4rem 0 0" },
  createRoutineButton: {
    background: "linear-gradient(135deg,#a855f7,#ec4899)",
    color: "#fff", border: "none", borderRadius: "12px",
    padding: ".8rem 1rem", fontWeight: 800, cursor: "pointer",
  },
  creatorForm: {
    marginTop: "1.2rem", paddingTop: "1.2rem",
    borderTop: "1px solid rgba(255,255,255,.08)",
  },
  creatorTextarea: {
    display: "block", width: "100%", boxSizing: "border-box",
    background: "rgba(0,0,0,.25)", color: "#fff",
    border: "1px solid rgba(192,132,252,.2)", borderRadius: "12px",
    padding: ".85rem .95rem", marginBottom: ".9rem",
    outline: "none", resize: "vertical", font: "inherit",
  },
  creatorExerciseHeading: { margin: "1.1rem 0 .7rem" },
  creatorSubtitle: { margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 850 },
  creatorCatalog: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: ".5rem", maxHeight: "360px", overflowY: "auto",
    padding: ".15rem", marginBottom: "1rem",
  },
  creatorExerciseOption: (selected) => ({
    width: "100%", minWidth: 0, display: "flex", alignItems: "center",
    gap: ".65rem", textAlign: "left",
    background: selected ? "rgba(168,85,247,.16)" : "rgba(255,255,255,.025)",
    color: "#f4f4f5",
    border: `1px solid ${selected ? "rgba(192,132,252,.55)" : "rgba(255,255,255,.08)"}`,
    borderRadius: "12px", padding: ".65rem", cursor: "pointer",
  }),
  creatorExerciseIcon: {
    width: "38px", height: "38px", flex: "0 0 38px",
    display: "grid", placeItems: "center", borderRadius: "10px",
    background: "rgba(168,85,247,.13)", fontSize: "1.2rem",
  },
  creatorExerciseText: {
    display: "flex", flexDirection: "column", gap: ".2rem",
    minWidth: 0, flex: 1,
  },
  creatorExerciseTextStrong: { overflow: "hidden" },
  creatorCheck: { color: "#d8b4fe", fontSize: "1.1rem", fontWeight: 900 },
  creatorConfigurations: { marginTop: "1.2rem" },
  creatorConfigCard: {
    marginTop: ".7rem", padding: ".85rem",
    background: "rgba(0,0,0,.17)",
    border: "1px solid rgba(192,132,252,.14)", borderRadius: "14px",
  },
  creatorConfigHeading: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", gap: ".5rem", color: "#f4f4f5",
  },
  creatorRemoveButton: {
    background: "rgba(239,68,68,.08)", color: "#fca5a5",
    border: "1px solid rgba(239,68,68,.18)",
    borderRadius: "8px", padding: ".35rem .55rem", cursor: "pointer",
    fontSize: ".75rem",
  },
  creatorError: {
    color: "#fca5a5", background: "rgba(239,68,68,.08)",
    border: "1px solid rgba(248,113,113,.2)",
    borderRadius: "10px", padding: ".75rem", fontSize: ".85rem",
  },
};
