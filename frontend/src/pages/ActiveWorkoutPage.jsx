import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { guardarEntrenamiento } from "../utils/rutinasStorage";

const KG_A_LB = 2.20462;

const redondearPeso = (valor, decimales = 2) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "";
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
};

const kgALibras = (kg) => redondearPeso(Number(kg) * KG_A_LB, 1);
const librasAKg = (lb) => redondearPeso(Number(lb) / KG_A_LB, 2);

const convertirPesoParaMostrar = (pesoKg, unidad) => {
  if (pesoKg === "" || pesoKg === null || pesoKg === undefined) return "";
  return unidad === "lb" ? kgALibras(pesoKg) : redondearPeso(pesoKg, 2);
};

const convertirPesoAKg = (peso, unidad) => {
  if (peso === "" || peso === null || peso === undefined) return "";
  const numero = Number(peso);
  if (!Number.isFinite(numero)) return "";
  return unidad === "lb" ? librasAKg(numero) : redondearPeso(numero, 2);
};

const PALABRAS_TIEMPO = [
  "trote", "trotar", "correr", "carrera", "running", "plancha", "plank",
  "abdomen", "abdominal", "abdominales", "bicicleta", "eliptica", "elíptica",
  "caminata", "caminar", "salto de cuerda", "cuerda", "mountain climber",
  "wall sit", "sentadilla", "sentadillas", "sentadilla isometrica", "sentadilla isométrica", "isometrico", "isométrico",
];

const MENU_SERIE = [
  { tipo: "calentamiento", etiqueta: "W", nombre: "Serie de Calentamiento", color: "#facc15" },
  { tipo: "normal", etiqueta: null, nombre: "Serie Normal", color: "#c084fc" },
  { tipo: "fallo", etiqueta: "F", nombre: "Serie al Fallo", color: "#ef4444" },
  { tipo: "drop", etiqueta: "D", nombre: "Serie Drop", color: "#38bdf8" },
];

const estilos = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a0533 100%)",
    padding: "6rem 1rem 3rem",
    color: "#fff",
    boxSizing: "border-box",
  },
  container: { maxWidth: "900px", margin: "0 auto" },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: "14px",
    padding: "1.1rem",
    marginBottom: "1rem",
    boxSizing: "border-box",
  },
  input: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(168,85,247,0.3)",
    borderRadius: "9px",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  menuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.65rem 0.8rem",
    background: "transparent",
    border: "none",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};

function esEjercicioPorTiempo(ejercicio = {}) {
  if (
    ejercicio.es_tiempo === true ||
    ejercicio.por_tiempo === true ||
    ejercicio.requiere_tiempo === true
  ) return true;

  const tipo = String(
    ejercicio.tipo || ejercicio.unidad_medida || ejercicio.unidad || ejercicio.modalidad || ""
  ).toLowerCase().trim();

  if (["tiempo", "time", "duration", "duracion", "duración", "segundos", "seconds"].includes(tipo)) {
    return true;
  }

  const nombre = String(ejercicio.nombre || "").toLowerCase();
  return PALABRAS_TIEMPO.some((palabra) => nombre.includes(palabra));
}

function obtenerDuracionInicial(ejercicio = {}, detalle = {}) {
  return Math.max(
    1,
    parseInt(
      detalle.duracion_segundos ?? detalle.duracion ?? ejercicio.duracion_segundos ?? ejercicio.duracion ?? 30,
      10
    ) || 30
  );
}

function crearSerie(numero, reps = 10, porTiempo = false, duracion = 30, anterior = {}) {
  return {
    tipo: "normal",
    numero,
    reps: porTiempo ? 0 : reps,
    duracion: porTiempo ? duracion : 0,
    peso: "",
    pesoKg: "",
    anteriorPeso: anterior.peso ?? "",
    anteriorPesoKg: anterior.pesoKg ?? "",
    anteriorUnidadPeso: anterior.unidadPeso ?? "kg",
    anteriorReps: anterior.reps ?? "",
    anteriorDuracion: anterior.duracion ?? "",
    hecho: false,
  };
}

function crearSets(cantidad, repsDefault, porTiempo = false, duracionDefault = 30) {
  return Array.from({ length: cantidad }, (_, index) =>
    crearSerie(index + 1, repsDefault, porTiempo, duracionDefault)
  );
}

function formatearTiempo(segundos) {
  const total = Math.max(0, Number(segundos) || 0);
  const minutos = Math.floor(total / 60);
  const segundosRestantes = total % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
}

const RUTINA_PROGRESO_KEY = "bodyRhythm_rutina_progreso_v2";

function leerProgresoRutina(rutinaId) {
  if (!rutinaId) return null;
  try {
    const data = JSON.parse(localStorage.getItem(RUTINA_PROGRESO_KEY) || "{}");
    return data[String(rutinaId)] || null;
  } catch {
    return null;
  }
}

function guardarProgresoRutina(rutinaId, progreso) {
  if (!rutinaId) return;
  try {
    const data = JSON.parse(localStorage.getItem(RUTINA_PROGRESO_KEY) || "{}");
    data[String(rutinaId)] = { ...progreso, actualizadoEn: new Date().toISOString() };
    localStorage.setItem(RUTINA_PROGRESO_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("No se pudo guardar el progreso de la rutina:", error);
  }
}

export default function ActiveWorkoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const rutina = state?.rutina || null;

  const [nombre, setNombre] = useState(rutina?.nombre || "Entrenamiento vacío");
  const [catalogo, setCatalogo] = useState([]);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState("");
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [busquedaEjercicio, setBusquedaEjercicio] = useState("");
  const [menuEjercicioAbierto, setMenuEjercicioAbierto] = useState(null);
  const [menuSerieAbierto, setMenuSerieAbierto] = useState(null);
  const [menuDescansoAbierto, setMenuDescansoAbierto] = useState(null);
  const [tiempoDescansoPicker, setTiempoDescansoPicker] = useState(60);
  const descansoPickerRef = useRef(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const progresoInicial = leerProgresoRutina(rutina?.id);
  const [descansos, setDescansos] = useState({});
  const [cronometros, setCronometros] = useState({});
  const [finalizado, setFinalizado] = useState(null);
  const [mostrarDescartar, setMostrarDescartar] = useState(false);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);

  const [ejercicios, setEjercicios] = useState(() => {
    if (!rutina?.ejercicios_detalle) return progresoInicial?.ejercicios || [];

    return rutina.ejercicios_detalle.map((detalle) => {
      const info = detalle.ejercicio || {};
      const porTiempo = esEjercicioPorTiempo(info);
      const guardado = progresoInicial?.ejercicios?.find(
        (item) => String(item.id) === String(detalle.id) || item.nombre === info.nombre
      );
      const setsBase = crearSets(
        detalle.series || 3,
        detalle.repeticiones || 10,
        porTiempo,
        obtenerDuracionInicial(info, detalle),
        guardado?.sets?.[0] || {}
      );

      const setsGuardados = guardado?.sets || [];
      const sets = (setsGuardados.length ? setsGuardados : setsBase).map((serie, index) => ({
        ...crearSerie(index + 1, detalle.repeticiones || 10, porTiempo, obtenerDuracionInicial(info, detalle)),
        ...serie,
        numero: index + 1,
        hecho: false,
      }));

      return {
        id: detalle.id,
        nombre: info.nombre || "Ejercicio",
        grupo: info.grupo_muscular || "",
        porTiempo,
        unidadPeso: guardado?.unidadPeso || "kg",
        descanso: guardado?.descanso ?? (detalle.descanso_segundos !== undefined ? Number(detalle.descanso_segundos) : 60),
        sets,
      };
    });
  });

  const entrenamientoTimerRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const ejerciciosFiltrados = catalogo.filter((ejercicio) => {
    const texto = busquedaEjercicio.trim().toLowerCase();
    if (!texto) return true;
    return `${ejercicio.nombre || ""} ${ejercicio.grupo_muscular || ""}`.toLowerCase().includes(texto);
  });

  const ejercicioSeleccionadoInfo = catalogo.find(
    (e) => String(e.id) === String(ejercicioSeleccionado)
  );

  const iconoGrupo = (grupo) => ({
    pecho: "🏋️", espalda: "🧗", hombros: "💪", biceps: "💪", triceps: "💪",
    abdomen: "🔥", cuadriceps: "🦵", femoral: "🦵", gluteos: "🍑",
    pantorrillas: "🦵", cardio: "🏃",
  }[String(grupo || "").toLowerCase()] || "💪");

  // ------------------------------------------------------
  // TEMPORIZADOR GENERAL + CATÁLOGO
  // ------------------------------------------------------
  useEffect(() => {
    entrenamientoTimerRef.current = setInterval(() => {
      setSegundosTranscurridos((segundos) => segundos + 1);
    }, 1000);

    api.get("/ejercicios/", { headers })
      .then((res) => setCatalogo(res.data))
      .catch(() => {});

    return () => {
      clearInterval(entrenamientoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Centrar automáticamente el valor actual cuando se abre el picker.
  useEffect(() => {
    if (menuDescansoAbierto === null) return;
    const frame = requestAnimationFrame(() => {
      if (!descansoPickerRef.current) return;
      const segundos = Math.min(600, Math.max(15, Math.round(Number(tiempoDescansoPicker) / 15) * 15));
      const index = segundos / 15 - 1;
      descansoPickerRef.current.scrollTo({ top: index * 56, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [menuDescansoAbierto, tiempoDescansoPicker]);

  // ------------------------------------------------------
  // DESCANSOS INDIVIDUALES POR SERIE
  // Cada serie puede tener su propio descanso visible en su misma fila.
  // ------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setDescansos((actuales) => {
        let cambio = false;
        const siguiente = { ...actuales };

        Object.entries(actuales).forEach(([key, descansoActual]) => {
          if (Number(descansoActual?.restante) <= 1) {
            delete siguiente[key];
            cambio = true;
          } else {
            siguiente[key] = {
              ...descansoActual,
              restante: Number(descansoActual.restante) - 1,
            };
            cambio = true;
          }
        });

        return cambio ? siguiente : actuales;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ------------------------------------------------------
  // CRONÓMETROS INDIVIDUALES POR SERIE
  // ------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setCronometros((actuales) => {
        let cambio = false;
        const siguiente = { ...actuales };
        Object.entries(actuales).forEach(([key, timer]) => {
          if (timer?.corriendo) {
            siguiente[key] = { ...timer, tiempo: timer.tiempo + 1 };
            cambio = true;
          }
        });
        return cambio ? siguiente : actuales;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const claveCronometro = (ejIdx, setIdx) => `${ejIdx}-${setIdx}`;
  const claveDescanso = (ejIdx, setIdx) => `${ejIdx}-${setIdx}`;

  const iniciarCronometro = (ejIdx, setIdx) => {
    const key = claveCronometro(ejIdx, setIdx);
    setCronometros((actuales) => ({
      ...actuales,
      [key]: { tiempo: actuales[key]?.tiempo || 0, corriendo: true },
    }));
  };

  const pausarCronometro = (ejIdx, setIdx) => {
    const key = claveCronometro(ejIdx, setIdx);
    setCronometros((actuales) => ({
      ...actuales,
      [key]: { ...(actuales[key] || { tiempo: 0 }), corriendo: false },
    }));
  };

  const reiniciarCronometro = (ejIdx, setIdx) => {
    const key = claveCronometro(ejIdx, setIdx);
    setCronometros((actuales) => ({
      ...actuales,
      [key]: { tiempo: 0, corriendo: false },
    }));
    actualizarSet(ejIdx, setIdx, "duracion", 0);
  };

  const detenerCronometro = (ejIdx, setIdx) => {
    const key = claveCronometro(ejIdx, setIdx);
    setCronometros((actuales) => ({
      ...actuales,
      [key]: { ...(actuales[key] || { tiempo: 0 }), corriendo: false },
    }));
  };

  // ------------------------------------------------------
  // SERIES
  // ------------------------------------------------------
  const actualizarSet = (ejIdx, setIdx, campo, valor) => {
    setEjercicios((prev) => {
      const copia = [...prev];
      const ejercicio = copia[ejIdx];
      const sets = [...ejercicio.sets];
      const serieActual = sets[setIdx];

      if (campo === "peso" && !ejercicio.porTiempo) {
        sets[setIdx] = {
          ...serieActual,
          peso: valor,
          pesoKg: convertirPesoAKg(valor, ejercicio.unidadPeso || "kg"),
        };
      } else {
        sets[setIdx] = { ...serieActual, [campo]: valor };
      }

      copia[ejIdx] = { ...ejercicio, sets };
      return copia;
    });
  };

  const toggleSet = (ejIdx, setIdx) => {
    const ejercicio = ejercicios[ejIdx];
    const serie = ejercicio?.sets[setIdx];
    if (!serie) return;

    const key = claveCronometro(ejIdx, setIdx);
    const timer = cronometros[key];
    const tiempoRegistrado = timer?.tiempo ?? (Number(serie.duracion) || 0);
    const nuevoHecho = !serie.hecho;

    if (nuevoHecho && ejercicio.porTiempo) {
      actualizarSet(ejIdx, setIdx, "duracion", tiempoRegistrado);
      detenerCronometro(ejIdx, setIdx);
    } else if (!nuevoHecho && ejercicio.porTiempo) {
      reiniciarCronometro(ejIdx, setIdx);
    }

    setEjercicios((prev) => {
      const copia = [...prev];
      const ej = { ...copia[ejIdx] };
      const sets = [...ej.sets];
      sets[setIdx] = {
        ...sets[setIdx],
        hecho: nuevoHecho,
        ...(ej.porTiempo && nuevoHecho ? { duracion: tiempoRegistrado } : {}),
      };
      ej.sets = sets;
      copia[ejIdx] = ej;
      return copia;
    });

    const descansoKey = claveDescanso(ejIdx, setIdx);

    if (nuevoHecho && Number(ejercicio.descanso) > 0) {
      setDescansos((actuales) => ({
        ...actuales,
        [descansoKey]: {
          ejIdx,
          setIdx,
          restante: Number(ejercicio.descanso),
        },
      }));
    } else if (!nuevoHecho) {
      setDescansos((actuales) => {
        const siguiente = { ...actuales };
        delete siguiente[descansoKey];
        return siguiente;
      });
    }
  };

  const agregarSerie = (ejIdx) => {
    setEjercicios((prev) => {
      const copia = [...prev];
      const ej = copia[ejIdx];
      const ultimo = ej.sets[ej.sets.length - 1];

      const nuevaSerie = crearSerie(
        ej.sets.length + 1,
        ultimo?.reps || 10,
        ej.porTiempo,
        ultimo?.duracion || 30
      );

      if (!ej.porTiempo) {
        nuevaSerie.pesoKg = ultimo?.pesoKg ?? convertirPesoAKg(ultimo?.peso, ej.unidadPeso || "kg");
        nuevaSerie.peso = convertirPesoParaMostrar(nuevaSerie.pesoKg, ej.unidadPeso || "kg");
      }

      copia[ejIdx] = {
        ...ej,
        sets: [...ej.sets, nuevaSerie],
      };

      return copia;
    });
  };

  const cambiarTipoSerie = (ejIdx, setIdx, tipo) => {
    setEjercicios((prev) => {
      const copia = [...prev];
      const sets = [...copia[ejIdx].sets];
      sets[setIdx] = { ...sets[setIdx], tipo };
      copia[ejIdx] = { ...copia[ejIdx], sets };
      return copia;
    });
    setMenuSerieAbierto(null);
  };

  const eliminarSerie = (ejIdx, setIdx) => {
    if (ejercicios[ejIdx].sets.length <= 1) return;

    detenerCronometro(ejIdx, setIdx);

    setEjercicios((prev) => {
      const copia = [...prev];
      const ej = copia[ejIdx];
      const sets = ej.sets
        .filter((_, index) => index !== setIdx)
        .map((serie, index) => ({ ...serie, numero: index + 1 }));

      copia[ejIdx] = { ...ej, sets };
      return copia;
    });

    setMenuSerieAbierto(null);
  };

  // ------------------------------------------------------
  // EJERCICIOS
  // ------------------------------------------------------
  const actualizarDescanso = (ejIdx, valorMinutos) => {
    const minutos = Math.max(0, Number.parseFloat(valorMinutos) || 0);
    setEjercicios((prev) => {
      const copia = [...prev];
      copia[ejIdx] = {
        ...copia[ejIdx],
        descanso: Math.round(minutos * 60),
      };
      return copia;
    });
  };

  const moverEjercicio = (idx, direccion) => {
    setEjercicios((prev) => {
      const copia = [...prev];
      const nuevoIdx = idx + direccion;
      if (nuevoIdx < 0 || nuevoIdx >= copia.length) return copia;
      [copia[idx], copia[nuevoIdx]] = [copia[nuevoIdx], copia[idx]];
      return copia;
    });
    setMenuEjercicioAbierto(null);
  };

  const eliminarEjercicio = (idx) => {
    if (!confirm("¿Quitar este ejercicio del entrenamiento?")) return;
    setEjercicios((prev) => prev.filter((_, i) => i !== idx));
    setMenuEjercicioAbierto(null);
  };

  const cambiarUnidadPeso = (ejIdx, nuevaUnidad) => {
    setEjercicios((prev) => prev.map((ej, idx) => {
      if (idx !== ejIdx || ej.porTiempo || ej.unidadPeso === nuevaUnidad) return ej;

      const unidadActual = ej.unidadPeso || "kg";

      return {
        ...ej,
        unidadPeso: nuevaUnidad,
        sets: ej.sets.map((serie) => {
          // pesoKg es el valor canónico. Así podemos cambiar Kg/Lb varias veces
          // sin acumular errores de conversión.
          const pesoKg =
            serie.pesoKg !== "" && serie.pesoKg !== undefined
              ? Number(serie.pesoKg)
              : convertirPesoAKg(serie.peso, unidadActual);

          if (!Number.isFinite(pesoKg)) {
            return { ...serie, peso: "", pesoKg: "" };
          }

          return {
            ...serie,
            pesoKg: redondearPeso(pesoKg, 2),
            peso: convertirPesoParaMostrar(pesoKg, nuevaUnidad),
          };
        }),
      };
    }));
  };

  const agregarEjercicioCatalogo = () => {
    if (!ejercicioSeleccionado) return;

    const info = catalogo.find((e) => String(e.id) === String(ejercicioSeleccionado));
    if (!info) return;

    const porTiempo = esEjercicioPorTiempo(info);

    setEjercicios((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        nombre: info.nombre,
        grupo: info.grupo_muscular || "",
        porTiempo,
        unidadPeso: "kg",
        descanso: 60,
        sets: crearSets(3, 10, porTiempo, obtenerDuracionInicial(info)),
      },
    ]);

    setEjercicioSeleccionado("");
    setSelectorAbierto(false);
    setBusquedaEjercicio("");
    setMostrarAgregar(false);
  };

  // ------------------------------------------------------
  // GUARDADO AUTOMÁTICO DE LA RUTINA
  // Los cambios de peso, unidad, reps, series, duración y descanso
  // quedan guardados en este navegador y no se borran al finalizar.
  // ------------------------------------------------------
  useEffect(() => {
    if (!rutina?.id || !ejercicios.length) return;
    const progreso = {
      nombre,
      ejercicios: ejercicios.map((ej) => ({
        id: ej.id,
        nombre: ej.nombre,
        porTiempo: ej.porTiempo,
        unidadPeso: ej.porTiempo ? null : ej.unidadPeso,
        descanso: ej.descanso,
        sets: ej.sets.map((serie) => ({
          tipo: serie.tipo || "normal",
          reps: serie.reps,
          duracion: ej.porTiempo ? Number(serie.duracion) || 0 : 0,
          peso: ej.porTiempo ? "" : serie.peso,
          pesoKg: ej.porTiempo ? "" : serie.pesoKg,
          anteriorPeso: serie.peso,
          anteriorPesoKg: serie.pesoKg,
          anteriorUnidadPeso: ej.unidadPeso,
          anteriorReps: serie.reps,
          anteriorDuracion: serie.duracion,
        })),
      })),
    };
    guardarProgresoRutina(rutina.id, progreso);
  }, [rutina?.id, nombre, ejercicios]);

  // ------------------------------------------------------
  // CONTADORES Y FINALIZACIÓN
  // ------------------------------------------------------
  const totalSets = ejercicios.reduce((total, ej) => total + ej.sets.length, 0);
  const setsHechos = ejercicios.reduce(
    (total, ej) => total + ej.sets.filter((serie) => serie.hecho).length,
    0
  );

  const ejecutarFinalizacion = () => {
    clearInterval(entrenamientoTimerRef.current);
    setMostrarFinalizar(false);

    const resumen = {
      fecha: new Date().toISOString(),
      nombre,
      duracionSeg: segundosTranscurridos,
      setsCompletados: setsHechos,
      setsTotales: totalSets,
      ejercicios: ejercicios.map((ej) => ({
        nombre: ej.nombre,
        porTiempo: ej.porTiempo,
        unidadPeso: ej.porTiempo ? null : ej.unidadPeso,
        descanso: ej.descanso,
        sets: ej.sets.map((serie) => ({
          tipo: serie.tipo || "normal",
          reps: ej.porTiempo ? null : serie.reps,
          duracionSegundos: ej.porTiempo ? Number(serie.duracion) || 0 : null,
          peso: ej.porTiempo ? "" : serie.peso,
          pesoKg: ej.porTiempo ? "" : serie.pesoKg,
          hecho: serie.hecho,
        })),
      })),
    };

    guardarEntrenamiento(resumen);
    if (rutina?.id) {
      guardarProgresoRutina(rutina.id, {
        nombre,
        ejercicios: resumen.ejercicios.map((ej, ejIdx) => ({
          id: ejercicios[ejIdx]?.id,
          nombre: ej.nombre,
          porTiempo: ej.porTiempo,
          unidadPeso: ej.unidadPeso,
          descanso: ej.descanso,
          sets: ej.sets.map((serie) => ({
            ...serie,
            hecho: false,
            anteriorPeso: serie.peso,
            anteriorPesoKg: serie.pesoKg,
            anteriorUnidadPeso: ej.unidadPeso,
            anteriorReps: serie.reps,
            anteriorDuracion: serie.duracionSegundos,
          })),
        })),
      });
    }
    setFinalizado(resumen);
  };

  const finalizar = () => {
    if (totalSets === 0 || setsHechos < totalSets) {
      setMostrarFinalizar(true);
      return;
    }
    ejecutarFinalizacion();
  };

  const guardarProgresoAhora = () => {
    if (!rutina?.id) return;
    guardarProgresoRutina(rutina.id, {
      nombre,
      ejercicios: ejercicios.map((ej) => ({
        id: ej.id,
        nombre: ej.nombre,
        porTiempo: ej.porTiempo,
        unidadPeso: ej.porTiempo ? null : ej.unidadPeso,
        descanso: ej.descanso,
        sets: ej.sets.map((serie) => ({
          tipo: serie.tipo || "normal",
          reps: serie.reps,
          duracion: ej.porTiempo ? Number(serie.duracion) || 0 : 0,
          peso: ej.porTiempo ? "" : serie.peso,
          pesoKg: ej.porTiempo ? "" : serie.pesoKg,
          anteriorPeso: serie.peso,
          anteriorPesoKg: serie.pesoKg,
          anteriorUnidadPeso: ej.unidadPeso,
          anteriorReps: serie.reps,
          anteriorDuracion: serie.duracion,
          hecho: false,
        })),
      })),
    });
  };

  const descartar = () => {
    guardarProgresoAhora();
    setMostrarDescartar(true);
  };

  const confirmarDescartar = () => {
    // Descartar cancela la sesión actual, pero NO borra la rutina guardada.
    setMostrarDescartar(false);
    navigate("/rutinas");
  };

  // ------------------------------------------------------
  // PANTALLA FINAL
  // ------------------------------------------------------
  if (finalizado) {
    return (
      <>
        <Navbar />
        <div style={finalOverlayStyle}>
          <div style={finalCardStyle}>
            <div style={finalIconStyle}>✓</div>
            <div style={finalEyebrowStyle}>ENTRENAMIENTO TERMINADO</div>
            <h1 style={finalTitleStyle}>¡Excelente trabajo!</h1>
            <p style={finalSubtitleStyle}>{finalizado.nombre}</p>

            <div style={finalStatsStyle}>
              <div style={finalStatStyle}>
                <span style={finalStatIconStyle}>⏱</span>
                <strong>{formatearTiempo(finalizado.duracionSeg)}</strong>
                <span>Duración</span>
              </div>
              <div style={finalStatDividerStyle} />
              <div style={finalStatStyle}>
                <span style={finalStatIconStyle}>✓</span>
                <strong>{finalizado.setsCompletados}/{finalizado.setsTotales}</strong>
                <span>Series completadas</span>
              </div>
            </div>

            <p style={finalSavedStyle}>💾 Tus pesos, libras, descansos y tiempos quedaron guardados para tu próxima sesión.</p>

            <button type="button" onClick={() => navigate("/rutinas")} style={finalPrimaryButtonStyle}>
              Volver a mis rutinas
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div style={estilos.page}>
        <div style={estilos.container}>
          {/* CABECERA */}
          <header style={headerStyle}>
            <div style={{ minWidth: 0 }}>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={{ ...tituloInput, width: "100%" }}
              />
              <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                ⏱ {formatearTiempo(segundosTranscurridos)} · {setsHechos}/{totalSets} series
              </div>
            </div>

            <div style={accionesStyle}>
              <button onClick={descartar} style={botonSecundario}>Descartar</button>
              <button onClick={finalizar} style={botonPrincipal}>Finalizar</button>
            </div>
          </header>

          {ejercicios.length === 0 && (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>
              Agrega un ejercicio para empezar.
            </p>
          )}

          {/* EJERCICIOS */}
          {ejercicios.map((ej, ejIdx) => (
            <section key={ej.id} style={estilos.card}>
              {/* TÍTULO DEL EJERCICIO */}
              <div style={ejercicioHeaderStyle}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: "#a855f7", fontSize: "1.05rem" }}>{ej.nombre}</h3>
                  <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>{ej.grupo}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {ej.porTiempo ? (
                    <span style={badgeTiempo}>⏱ Por tiempo</span>
                  ) : (
                    <div style={unidadStyle}>
                      <button onClick={() => cambiarUnidadPeso(ejIdx, "kg")} style={unidadButton(ej.unidadPeso === "kg")}>Kg</button>
                      <button onClick={() => cambiarUnidadPeso(ejIdx, "lb")} style={unidadButton(ej.unidadPeso === "lb")}>Lb</button>
                    </div>
                  )}

                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setMenuEjercicioAbierto(menuEjercicioAbierto === ejIdx ? null : ejIdx)}
                      style={menuTrigger}
                    >
                      ⋮
                    </button>

                    {menuEjercicioAbierto === ejIdx && (
                      <div style={menuEjercicioStyle}>
                        <button
                          disabled={ejIdx === 0}
                          onClick={() => moverEjercicio(ejIdx, -1)}
                          style={{ ...estilos.menuItem, opacity: ejIdx === 0 ? 0.35 : 1 }}
                        >
                          ↑ Mover arriba
                        </button>
                        <button
                          disabled={ejIdx === ejercicios.length - 1}
                          onClick={() => moverEjercicio(ejIdx, 1)}
                          style={{ ...estilos.menuItem, opacity: ejIdx === ejercicios.length - 1 ? 0.35 : 1 }}
                        >
                          ↓ Mover abajo
                        </button>
                        <button
                          onClick={() => eliminarEjercicio(ejIdx)}
                          style={{ ...estilos.menuItem, color: "#ef4444" }}
                        >
                          🗑 Quitar ejercicio
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SELECTOR DE DESCANSO: picker tipo rueda, compacto y visual */}
              <div style={descansoMenuWrap}>
                <button
                  type="button"
                  onClick={() => {
                    const valorActual = Math.min(600, Math.max(15, Math.round(Number(ej.descanso) || 60) / 15) * 15);
                    setTiempoDescansoPicker(valorActual);
                    setMenuDescansoAbierto(ejIdx);
                  }}
                  style={descansoMenuTrigger}
                  aria-expanded={menuDescansoAbierto === ejIdx}
                  aria-label={`Tiempo de descanso: ${formatearTiempo(Number(ej.descanso) || 0)}`}
                >
                  <span style={descansoMenuIcon}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 7.5v4.8l3.2 1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <strong style={descansoMenuValue}>{formatearTiempo(Number(ej.descanso) || 0)}</strong>
                  <span style={descansoMenuChevron}>⌄</span>
                </button>

                {menuDescansoAbierto === ejIdx && (
                  <div style={descansoPickerOverlay} role="dialog" aria-modal="true" aria-label="Temporizador de descanso">
                    <div
                      style={descansoPickerBackdrop}
                      onClick={() => setMenuDescansoAbierto(null)}
                      aria-hidden="true"
                    />
                    <div style={descansoPickerSheet}>
                      <div style={descansoPickerHeader}>
                        <h3 style={descansoPickerTitle}>Temporizador de Descanso</h3>
                        <p style={descansoPickerExercise}>{ej.nombre}</p>
                      </div>

                      <div
                        ref={descansoPickerRef}
                        style={descansoWheel}
                        onScroll={(event) => {
                          const wheel = event.currentTarget;
                          if (wheel.__pickerScrollFrame) return;
                          wheel.__pickerScrollFrame = requestAnimationFrame(() => {
                            wheel.__pickerScrollFrame = null;
                            const itemHeight = 56;
                            const index = Math.round(wheel.scrollTop / itemHeight);
                            const segundos = Math.min(600, Math.max(15, (index + 1) * 15));
                            setTiempoDescansoPicker((actual) => actual === segundos ? actual : segundos);
                          });
                        }}
                      >
                        <div style={descansoWheelSpacer} />
                        {Array.from({ length: 40 }, (_, index) => (index + 1) * 15).map((segundos) => {
                          const activa = tiempoDescansoPicker === segundos;
                          const minutos = Math.floor(segundos / 60);
                          const segundosRestantes = segundos % 60;
                          const label = `${String(minutos).padStart(1, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
                          return (
                            <button
                              key={segundos}
                              type="button"
                              onClick={() => {
                                setTiempoDescansoPicker(segundos);
                                requestAnimationFrame(() => {
                                  if (descansoPickerRef.current) {
                                    const index = segundos / 15 - 1;
                                    descansoPickerRef.current.scrollTo({ top: index * 56, behavior: "smooth" });
                                  }
                                });
                              }}
                              style={{ ...descansoWheelItem, ...(activa ? descansoWheelItemActive : {}) }}
                            >
                              {label}
                            </button>
                          );
                        })}
                        <div style={descansoWheelSpacer} />
                        <div style={descansoWheelSelection} aria-hidden="true" />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          actualizarDescanso(ejIdx, tiempoDescansoPicker / 60);
                          setMenuDescansoAbierto(null);
                        }}
                        style={descansoPickerDone}
                      >
                        Listo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* TABLA DE SERIES */}
              <div style={{ width: "100%", overflow: "visible" }}>
                <div style={{ width: "100%", overflow: "visible" }}>
                  <div style={gridStyle(ej.porTiempo, true)}>
                    <span>SERIE</span>
                    <span>ANTERIOR</span>
                    {ej.porTiempo ? <span>TIEMPO</span> : <><span>{(ej.unidadPeso || "kg").toUpperCase()}</span><span>REPS</span></>}
                    <span style={{ textAlign: "center" }}>✓</span>
                  </div>

                  {ej.sets.map((serie, setIdx) => {
                    const serieKey = `${ejIdx}-${setIdx}`;
                    const timerActual = cronometros[serieKey] || { tiempo: Number(serie.duracion) || 0, corriendo: false };
                    const timerActivo = Boolean(timerActual.corriendo);
                    const tiempo = Number(timerActual.tiempo) || Number(serie.duracion) || 0;
                    const tipoConfig = MENU_SERIE.find((item) => item.tipo === serie.tipo) || MENU_SERIE[1];
                    const etiqueta = serie.tipo === "normal" ? setIdx + 1 : tipoConfig.etiqueta;

                    const descansoActual = descansos[serieKey];

                    return (
                      <div key={serieKey} style={{ marginBottom: descansoActual ? "0.55rem" : "0.2rem" }}>
                        <div style={gridStyle(ej.porTiempo)}>
                        {/* TIPO DE SERIE */}
                        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                          <button
                            onClick={() => setMenuSerieAbierto(menuSerieAbierto === serieKey ? null : serieKey)}
                            style={serieBadgeStyle(tipoConfig.color)}
                          >
                            {etiqueta}
                          </button>

                          {menuSerieAbierto === serieKey && (
                            <div style={menuSerieStyle}>
                              {MENU_SERIE.map((opcion) => {
                                const opcionEtiqueta = opcion.tipo === "normal" ? setIdx + 1 : opcion.etiqueta;
                                const activa = serie.tipo === opcion.tipo;

                                return (
                                  <button
                                    key={opcion.tipo}
                                    type="button"
                                    onClick={() => cambiarTipoSerie(ejIdx, setIdx, opcion.tipo)}
                                    style={menuSerieOptionStyle(opcion.color, activa)}
                                  >
                                    <span style={{ ...menuSerieOptionIcon, color: opcion.color, borderColor: `${opcion.color}55`, background: `${opcion.color}18` }}>
                                      {opcionEtiqueta}
                                    </span>
                                    <span style={{ flex: 1, whiteSpace: "nowrap" }}>{opcion.nombre.replace("Serie de ", "").replace("Serie al ", "")}</span>
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                disabled={ej.sets.length <= 1}
                                onClick={() => eliminarSerie(ejIdx, setIdx)}
                                style={{ ...menuSerieDeleteStyle, opacity: ej.sets.length <= 1 ? 0.35 : 1, cursor: ej.sets.length <= 1 ? "not-allowed" : "pointer" }}
                              >
                                <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>×</span>
                                <span>Eliminar serie</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ANTERIOR */}
                        <div style={anteriorStyle}>
                          {ej.porTiempo
                            ? serie.anteriorDuracion
                              ? formatearTiempo(serie.anteriorDuracion)
                              : "-"
                            : serie.anteriorPeso || serie.anteriorPesoKg || serie.anteriorReps
                              ? `${convertirPesoParaMostrar(
                                  serie.anteriorPesoKg !== "" && serie.anteriorPesoKg !== null && serie.anteriorPesoKg !== undefined
                                    ? serie.anteriorPesoKg
                                    : convertirPesoAKg(serie.anteriorPeso, serie.anteriorUnidadPeso || ej.unidadPeso || "kg"),
                                  ej.unidadPeso || "kg"
                                ) || 0}${ej.unidadPeso || "kg"} × ${serie.anteriorReps || 0}`
                              : "-"}
                        </div>

                        {/* TIEMPO / PESO */}
                        {ej.porTiempo ? (
                          <div style={cronometroCell}>
                            <button
                              onClick={() => {
                                if (serie.hecho) return;
                                if (timerActivo) pausarCronometro(ejIdx, setIdx);
                                else iniciarCronometro(ejIdx, setIdx);
                              }}
                              disabled={serie.hecho}
                              style={playButtonStyle(serie.hecho)}
                              aria-label={timerActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                            >
                              {timerActivo ? "Ⅱ" : "▶"}
                            </button>

                            <div style={cronometroDisplay}>
                              {formatearTiempo(tiempo)}
                            </div>

                            <button
                              onClick={() => reiniciarCronometro(ejIdx, setIdx)}
                              disabled={serie.hecho}
                              style={reiniciarButtonStyle(serie.hecho)}
                              aria-label="Reiniciar cronómetro"
                            >
                              ↻
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0"
                              value={serie.peso}
                              placeholder="0"
                              onChange={(e) => actualizarSet(ejIdx, setIdx, "peso", e.target.value)}
                              style={{ ...estilos.input, width: "100%", height: "42px", padding: "0.5rem", textAlign: "center" }}
                            />
                            <input
                              type="number"
                              min="1"
                              value={serie.reps}
                              onChange={(e) => actualizarSet(ejIdx, setIdx, "reps", e.target.value)}
                              style={{ ...estilos.input, width: "100%", height: "42px", padding: "0.5rem", textAlign: "center" }}
                            />
                          </>
                        )}

                        {/* CHULEADO */}
                          <button
                            onClick={() => toggleSet(ejIdx, setIdx)}
                            style={checkButtonStyle(serie.hecho)}
                            aria-label={serie.hecho ? "Desmarcar serie" : "Completar serie"}
                          >
                            {serie.hecho ? "✓" : ""}
                          </button>
                        </div>

                        {descansoActual && (
                          <div style={descansoInlineStyle}>
                            <div style={descansoInlineInfo}>
                              <span style={descansoInlineIcon}>⏱</span>
                              <div>
                                <strong>Descanso de esta serie</strong>
                                <span>Se está contando aquí mismo</span>
                              </div>
                            </div>
                            <strong style={descansoInlineTime}>
                              {formatearTiempo(descansoActual.restante)}
                            </strong>
                            <div style={descansoInlineActions}>
                              <button
                                type="button"
                                onClick={() => setDescansos((actuales) => ({
                                  ...actuales,
                                  [serieKey]: {
                                    ...actuales[serieKey],
                                    restante: Math.max(0, Number(actuales[serieKey]?.restante || 0) - 15),
                                  },
                                }))}
                                style={botonDescanso}
                              >
                                −15s
                              </button>
                              <button
                                type="button"
                                onClick={() => setDescansos((actuales) => ({
                                  ...actuales,
                                  [serieKey]: {
                                    ...actuales[serieKey],
                                    restante: Number(actuales[serieKey]?.restante || 0) + 15,
                                  },
                                }))}
                                style={botonDescanso}
                              >
                                +15s
                              </button>
                              <button
                                type="button"
                                onClick={() => setDescansos((actuales) => {
                                  const siguiente = { ...actuales };
                                  delete siguiente[serieKey];
                                  return siguiente;
                                })}
                                style={botonSaltar}
                              >
                                Saltar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => agregarSerie(ejIdx)} style={agregarSerieStyle}>
                + Agregar serie
              </button>
            </section>
          ))}

          {/* AGREGAR EJERCICIO */}
          {mostrarAgregar ? (
            <div style={{ ...estilos.card, background: "linear-gradient(145deg, rgba(168,85,247,0.12), rgba(236,72,153,0.06))" }}>
              <div style={selectorBoxStyle}>
                <button
                  type="button"
                  onClick={() => setSelectorAbierto((abierto) => !abierto)}
                  style={selectorTriggerStyle}
                >
                  <span style={selectorTriggerIcon}>{ejercicioSeleccionadoInfo ? iconoGrupo(ejercicioSeleccionadoInfo.grupo_muscular) : "🏋️"}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <strong style={{ display: "block", color: "#fff", fontSize: "0.9rem" }}>
                      {ejercicioSeleccionadoInfo?.nombre || "Seleccionar ejercicio"}
                    </strong>
                    <small style={{ color: "#9ca3af" }}>
                      {ejercicioSeleccionadoInfo ? (ejercicioSeleccionadoInfo.grupo_muscular || "Ejercicio") : "Elige un ejercicio para añadirlo"}
                    </small>
                  </span>
                  <span style={{ color: "#c084fc", fontSize: "1.1rem", transform: selectorAbierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}>⌄</span>
                </button>

                {selectorAbierto && (
                  <div style={selectorMenuStyle}>
                    <input
                      autoFocus
                      value={busquedaEjercicio}
                      onChange={(e) => setBusquedaEjercicio(e.target.value)}
                      placeholder="🔎 Buscar ejercicio..."
                      style={{ ...estilos.input, width: "100%", padding: "0.65rem 0.75rem", marginBottom: "0.45rem" }}
                    />
                    <div style={selectorListStyle}>
                      {ejerciciosFiltrados.length === 0 ? (
                        <div style={selectorEmptyStyle}>No encontramos ese ejercicio.</div>
                      ) : (
                        ejerciciosFiltrados.map((ejercicio) => {
                          const seleccionado = String(ejercicio.id) === String(ejercicioSeleccionado);
                          return (
                            <button
                              key={ejercicio.id}
                              type="button"
                              onClick={() => {
                                setEjercicioSeleccionado(String(ejercicio.id));
                                setSelectorAbierto(false);
                                setBusquedaEjercicio("");
                              }}
                              style={{ ...selectorItemStyle, ...(seleccionado ? selectorItemActiveStyle : {}) }}
                            >
                              <span style={selectorItemIcon}>{iconoGrupo(ejercicio.grupo_muscular)}</span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <strong style={{ display: "block", color: "#f4f4f5" }}>{ejercicio.nombre}</strong>
                                <small style={{ color: "#9ca3af" }}>{ejercicio.grupo_muscular || "Entrenamiento"}</small>
                              </span>
                              {seleccionado && <span style={{ color: "#4ade80", fontWeight: 900 }}>✓</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.8rem" }}>
                <button onClick={agregarEjercicioCatalogo} style={botonPrincipal}>Agregar</button>
                <button type="button" onClick={() => { setMostrarAgregar(false); setSelectorAbierto(false); setBusquedaEjercicio(""); }} style={botonSecundario}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setMostrarAgregar(true)} style={agregarEjercicioStyle}>
              + Agregar ejercicio
            </button>
          )}
        </div>
      </div>

      {mostrarFinalizar && (
        <div style={modalOverlayStyle}>
          <div style={finishConfirmModalStyle}>
            <div style={finishConfirmIconStyle}>✓</div>
            <div style={finishConfirmEyebrowStyle}>FINALIZAR ENTRENAMIENTO</div>
            <h2 style={finishConfirmTitleStyle}>¿Quieres finalizar la sesión?</h2>
            <p style={finishConfirmTextStyle}>
              {totalSets === 0
                ? "Todavía no has agregado ejercicios. Puedes finalizar de todas formas."
                : `Te faltan ${totalSets - setsHechos} serie(s) por completar. Puedes finalizar de todas formas y conservar tus cambios.`}
            </p>
            <div style={finishConfirmActionsStyle}>
              <button type="button" onClick={() => setMostrarFinalizar(false)} style={finishCancelButtonStyle}>
                Seguir entrenando
              </button>
              <button type="button" onClick={ejecutarFinalizacion} style={finishConfirmButtonStyle}>
                Finalizar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarDescartar && (
        <div style={modalOverlayStyle}>
          <div style={discardModalStyle}>
            <div style={discardModalIconStyle}>×</div>
            <div style={discardModalEyebrowStyle}>DESCARTAR ENTRENAMIENTO</div>
            <h2 style={discardModalTitleStyle}>¿Quieres descartar la sesión?</h2>
            <p style={discardModalTextStyle}>Si descartas esta sesión saldrás del entrenamiento actual. Tus pesos, libras, descansos y configuraciones ya guardados se conservarán para la próxima sesión.</p>
            <div style={discardActionsStyle}>
              <button type="button" onClick={() => setMostrarDescartar(false)} style={discardContinueButtonStyle}>
                Continuar entrenando
              </button>
              <button type="button" onClick={confirmarDescartar} style={discardConfirmButtonStyle}>
                Descartar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ======================================================
// ESTILOS
// ======================================================

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "1rem",
  marginBottom: "1rem",
  flexWrap: "wrap",
};

const tituloInput = {
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: "1.55rem",
  fontWeight: 800,
  outline: "none",
  padding: 0,
};

const accionesStyle = { display: "flex", gap: "0.55rem" };

const botonPrincipal = {
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "#fff",
  border: "none",
  padding: "0.65rem 1.1rem",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const botonSecundario = {
  background: "transparent",
  color: "#9ca3af",
  border: "1px solid #444",
  padding: "0.65rem 1rem",
  borderRadius: "10px",
  cursor: "pointer",
};


const descansoMenuWrap = {
  position: "relative",
  margin: "0.65rem 0 0.55rem",
  zIndex: 30,
};

const descansoMenuTrigger = {
  width: "auto",
  minWidth: "104px",
  minHeight: "40px",
  marginLeft: "0",
  marginRight: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "0.45rem",
  padding: "0.38rem 0.55rem",
  borderRadius: "11px",
  border: "1px solid rgba(168,85,247,0.28)",
  background: "rgba(168,85,247,0.07)",
  color: "#f3f4f6",
  cursor: "pointer",
  textAlign: "left",
};

const descansoMenuIcon = {
  width: "27px",
  height: "27px",
  display: "grid",
  placeItems: "center",
  borderRadius: "7px",
  background: "rgba(168,85,247,0.16)",
  border: "1px solid rgba(168,85,247,0.24)",
  color: "#d8b4fe",
};

const descansoMenuValue = {
  padding: "0.2rem 0.35rem",
  color: "#f5e9ff",
  fontSize: "0.82rem",
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
};

const descansoMenuChevron = {
  color: "#c4b5fd",
  fontSize: "0.95rem",
  width: "14px",
  textAlign: "center",
};

const descansoPickerOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 99999,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const descansoPickerBackdrop = {
  position: "absolute",
  inset: 0,
  background: "rgba(5,3,12,0.66)",
  backdropFilter: "blur(7px)",
};

const descansoPickerSheet = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "92dvh",
  boxSizing: "border-box",
  overflow: "hidden",
  padding: "0.8rem 1.15rem 1.15rem",
  borderRadius: "28px 28px 0 0",
  background: "linear-gradient(160deg, #15121f 0%, #1c102b 55%, #241333 100%)",
  border: "1px solid rgba(168,85,247,0.28)",
  boxShadow: "0 -24px 70px rgba(0,0,0,0.55)",
};

const descansoPickerHeader = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.25rem",
  padding: "0.35rem 0.3rem 1.05rem",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  textAlign: "center",
};

const descansoPickerTitle = {
  margin: 0,
  color: "#fff",
  fontSize: "1.55rem",
  fontWeight: 500,
  letterSpacing: "-0.02em",
};

const descansoPickerExercise = {
  margin: "0.35rem 0 0",
  color: "#8f8aa0",
  fontSize: "1.05rem",
};

const descansoWheel = {
  position: "relative",
  height: "300px",
  margin: "0.65rem 0 1rem",
  overflowY: "auto",
  overflowX: "hidden",
  scrollSnapType: "y mandatory",
  scrollbarWidth: "none",
  overscrollBehavior: "contain",
  maskImage: "linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%)",
};

const descansoWheelSpacer = {
  height: "122px",
  flex: "0 0 122px",
};

const descansoWheelItem = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "56px",
  boxSizing: "border-box",
  border: "none",
  background: "transparent",
  color: "#4d4b55",
  fontSize: "2rem",
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  scrollSnapAlign: "start",
  cursor: "pointer",
  transition: "color .18s ease, transform .18s ease, background .18s ease",
};

const descansoWheelItemActive = {
  color: "#fff",
  background: "rgba(255,255,255,0.035)",
  borderRadius: "22px",
  transform: "scale(1.02)",
};

const descansoWheelSelection = {
  position: "absolute",
  left: "0",
  right: "0",
  top: "122px",
  height: "56px",
  pointerEvents: "none",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.025)",
  boxShadow: "inset 0 0 24px rgba(168,85,247,0.035)",
};

const descansoPickerDone = {
  width: "100%",
  height: "62px",
  border: "1px solid rgba(168,85,247,0.5)",
  borderRadius: "17px",
  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
  color: "#fff",
  fontSize: "1.1rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(168,85,247,0.24)",
};

const tipoSerieBar = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "0.7rem",
  padding: "0.65rem 0.75rem",
  marginBottom: "0.7rem",
  borderRadius: "12px",
  background: "rgba(0,0,0,0.2)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const tipoSerieTitle = {
  color: "#d1d5db",
  fontSize: "0.78rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const tipoSerieOptions = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "0.45rem",
};

const tipoSerieOption = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.28rem 0.5rem",
  borderRadius: "9px",
  background: "rgba(255,255,255,0.035)",
  color: "#a1a1aa",
  fontSize: "0.68rem",
  fontWeight: 700,
};

const tipoSerieIcon = {
  width: "27px",
  height: "27px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "7px",
  fontSize: "0.82rem",
  fontWeight: 900,
};

const descansoInlineStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  flexWrap: "wrap",
  marginTop: "0.35rem",
  padding: "0.65rem 0.75rem",
  borderRadius: "10px",
  background: "rgba(168,85,247,0.12)",
  border: "1px solid rgba(168,85,247,0.35)",
}

const descansoInlineInfo = {
  display: "flex",
  alignItems: "center",
  gap: "0.55rem",
  minWidth: "170px",
}

const descansoInlineIcon = {
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  borderRadius: "8px",
  background: "rgba(168,85,247,0.2)",
  color: "#d8b4fe",
}

const descansoInlineTime = {
  fontSize: "1.35rem",
  fontVariantNumeric: "tabular-nums",
  color: "#fff",
  minWidth: "58px",
  textAlign: "center",
}

const descansoInlineActions = {
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  flexWrap: "wrap",
}

const descansoStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "1rem",
  background: "rgba(168,85,247,0.12)",
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: "12px",
  padding: "0.8rem 1rem",
  marginBottom: "1rem",
};

const botonDescanso = {
  background: "rgba(168,85,247,0.2)",
  color: "#d8b4fe",
  border: "1px solid rgba(168,85,247,0.4)",
  padding: "0.35rem 0.6rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.75rem",
};

const botonSaltar = {
  background: "transparent",
  color: "#9ca3af",
  border: "1px solid #555",
  padding: "0.35rem 0.6rem",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.75rem",
};

const ejercicioHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  marginBottom: "0.3rem",
};

const badgeTiempo = {
  color: "#60a5fa",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: "6px",
  padding: "0.25rem 0.5rem",
  fontSize: "0.72rem",
  fontWeight: 700,
};

const unidadStyle = {
  display: "inline-flex",
  padding: "0.15rem",
  borderRadius: "7px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(168,85,247,0.3)",
};

const unidadButton = (activo) => ({
  border: "none",
  borderRadius: "5px",
  padding: "0.25rem 0.5rem",
  background: activo ? "#a855f7" : "transparent",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.7rem",
  fontWeight: 700,
});

const menuTrigger = {
  background: "none",
  border: "none",
  color: "#9ca3af",
  fontSize: "1.3rem",
  cursor: "pointer",
  padding: "0 0.25rem",
};

const menuEjercicioStyle = {
  position: "absolute",
  right: 0,
  top: "1.8rem",
  zIndex: 100,
  minWidth: "175px",
  background: "#1a0533",
  border: "1px solid rgba(168,85,247,0.3)",
  borderRadius: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
  overflow: "hidden",
};

const gridStyle = (porTiempo, encabezado = false) => ({
  display: "grid",
  gridTemplateColumns: porTiempo
    ? "36px 50px minmax(0, 1fr) 36px"
    : "36px 50px minmax(42px, 1fr) minmax(42px, 1fr) 36px",
  gap: "0.35rem",
  alignItems: "center",
  minHeight: encabezado ? "40px" : "64px",
  color: encabezado ? "#a1a1aa" : "#fff",
  fontSize: encabezado ? "0.78rem" : "0.98rem",
  fontWeight: encabezado ? 800 : 400,
  textTransform: encabezado ? "uppercase" : "none",
  textAlign: "center",
  width: "100%",
});

const anteriorStyle = {
  color: "#777",
  fontSize: "0.7rem",
  textAlign: "center",
  justifySelf: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cronometroCell = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.3rem",
  width: "100%",
  justifySelf: "center",
};

const cronometroDisplay = {
  minWidth: "62px",
  maxWidth: "92px",
  width: "100%",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
};

const playButtonStyle = (disabled) => ({
  width: "32px",
  height: "32px",
  minWidth: "32px",
  borderRadius: "50%",
  border: "2px solid #2196f3",
  background: "transparent",
  color: "#2196f3",
  display: "grid",
  placeItems: "center",
  padding: 0,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontSize: "0.72rem",
  fontWeight: 800,
});

const reiniciarButtonStyle = (disabled) => ({
  width: "26px",
  height: "26px",
  minWidth: "26px",
  borderRadius: "7px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#9ca3af",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontSize: "0.9rem",
  padding: 0,
});

const checkButtonStyle = (hecho) => ({
  width: "34px",
  height: "34px",
  borderRadius: "9px",
  border: hecho ? "1px solid #22c55e" : "1px solid rgba(168,85,247,0.35)",
  background: hecho ? "linear-gradient(135deg, rgba(34,197,94,0.28), rgba(34,197,94,0.10))" : "linear-gradient(135deg, rgba(168,85,247,0.16), rgba(255,255,255,0.04))",
  color: hecho ? "#4ade80" : "#a855f7",
  cursor: "pointer",
  fontSize: hecho ? "1.05rem" : "1.2rem",
  fontWeight: 900,
  justifySelf: "center",
  display: "grid",
  placeItems: "center",
  boxShadow: hecho ? "0 0 14px rgba(34,197,94,0.16)" : "0 0 12px rgba(168,85,247,0.10)",
  transition: "all 0.2s ease",
});

const serieBadgeStyle = (color) => ({
  width: "34px",
  height: "34px",
  border: `1px solid ${color}55`,
  borderRadius: "10px",
  background: `${color}16`,
  color,
  cursor: "pointer",
  fontSize: "0.92rem",
  fontWeight: 900,
  display: "grid",
  placeItems: "center",
  boxShadow: `0 4px 14px ${color}12`,
  transition: "transform 0.15s ease, background 0.15s ease",
});

const menuSerieStyle = {
  position: "absolute",
  left: "calc(100% + 10px)",
  top: "50%",
  transform: "translateY(-50%)",
  width: "215px",
  zIndex: 999,
  padding: "0.35rem",
  background: "#19191c",
  border: "1px solid rgba(168,85,247,0.28)",
  borderRadius: "12px",
  boxShadow: "0 14px 35px rgba(0,0,0,0.6)",
  overflow: "hidden",
};

const menuSerieOptionStyle = (color, activa) => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "0.55rem",
  padding: "0.5rem 0.55rem",
  minHeight: "44px",
  border: "1px solid transparent",
  borderRadius: "9px",
  background: activa ? `${color}12` : "transparent",
  color: "#f4f4f5",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "0.82rem",
  fontWeight: activa ? 700 : 500,
});

const menuSerieOptionIcon = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "8px",
  fontSize: "0.88rem",
  fontWeight: 900,
};

const menuSerieDeleteStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "0.55rem",
  marginTop: "0.2rem",
  padding: "0.5rem 0.6rem",
  minHeight: "40px",
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.07)",
  background: "transparent",
  color: "#ef4444",
  fontSize: "0.8rem",
  fontWeight: 700,
  textAlign: "left",
};

const agregarSerieStyle = {
  width: "100%",
  marginTop: "0.6rem",
  padding: "0.6rem",
  borderRadius: "8px",
  border: "1px dashed rgba(168,85,247,0.4)",
  background: "rgba(168,85,247,0.08)",
  color: "#a855f7",
  cursor: "pointer",
  fontWeight: 600,
};

const agregarEjercicioStyle = {
  width: "100%",
  padding: "0.9rem",
  marginTop: "0.2rem",
  borderRadius: "12px",
  border: "1px solid rgba(168,85,247,0.3)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
const selectorBoxStyle = { position: "relative", width: "100%" };
const selectorTriggerStyle = { width: "100%", minHeight: "64px", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.8rem", borderRadius: "14px", border: "1px solid rgba(168,85,247,0.38)", background: "rgba(9,6,16,0.72)", color: "#fff", cursor: "pointer", boxSizing: "border-box" };
const selectorTriggerIcon = { width: "40px", height: "40px", minWidth: "40px", display: "grid", placeItems: "center", borderRadius: "11px", background: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.14))", fontSize: "1.2rem" };
const selectorMenuStyle = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 1200, padding: "0.65rem", borderRadius: "16px", border: "1px solid rgba(168,85,247,0.35)", background: "#17101f", boxShadow: "0 22px 50px rgba(0,0,0,0.55)" };
const selectorListStyle = { maxHeight: "280px", overflowY: "auto", display: "grid", gap: "0.3rem" };
const selectorItemStyle = { width: "100%", display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.65rem", borderRadius: "11px", border: "1px solid transparent", background: "transparent", color: "#fff", cursor: "pointer", textAlign: "left" };
const selectorItemActiveStyle = { background: "rgba(168,85,247,0.13)", borderColor: "rgba(168,85,247,0.35)" };
const selectorItemIcon = { width: "36px", height: "36px", minWidth: "36px", display: "grid", placeItems: "center", borderRadius: "10px", background: "rgba(255,255,255,0.06)", fontSize: "1rem" };
const selectorEmptyStyle = { padding: "1rem", color: "#9ca3af", textAlign: "center", fontSize: "0.85rem" };

const botonPeligro = {
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  color: "#fff",
  border: "none",
  padding: "0.65rem 1rem",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const finalOverlayStyle = {
  position: "fixed",
  inset: 0,
  width: "100vw",
  height: "100dvh",
  zIndex: 5000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  boxSizing: "border-box",
  background: "radial-gradient(circle at 50% 35%, rgba(168,85,247,0.22), transparent 35%), rgba(6,5,12,0.96)",
  overflowY: "auto",
};

const finalCardStyle = {
  width: "min(100%, 560px)",
  boxSizing: "border-box",
  textAlign: "center",
  padding: "2.3rem 1.5rem 1.6rem",
  borderRadius: "26px",
  background: "linear-gradient(160deg, rgba(32,20,52,0.98), rgba(16,12,26,0.99))",
  border: "1px solid rgba(192,132,252,0.35)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 50px rgba(168,85,247,0.14)",
};

const finalIconStyle = {
  width: "76px",
  height: "76px",
  margin: "0 auto 1rem",
  display: "grid",
  placeItems: "center",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "#fff",
  fontSize: "2.3rem",
  fontWeight: 950,
  boxShadow: "0 14px 35px rgba(168,85,247,0.3)",
};

const finalEyebrowStyle = { color: "#c4b5fd", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.16em" };
const finalTitleStyle = { margin: "0.35rem 0 0.35rem", fontSize: "clamp(1.8rem, 5vw, 2.45rem)", lineHeight: 1.1 };
const finalSubtitleStyle = { margin: 0, color: "#a1a1aa", fontSize: "0.95rem" };
const finalStatsStyle = { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", margin: "1.8rem 0 1rem", padding: "1rem", borderRadius: "18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" };
const finalStatStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" };
const finalStatIconStyle = { color: "#c084fc", fontSize: "1.1rem" };
const finalStatDividerStyle = { width: "1px", height: "48px", background: "rgba(255,255,255,0.1)" };
const finalSavedStyle = { margin: "0 0 1.3rem", padding: "0.75rem 0.9rem", borderRadius: "12px", background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.16)", color: "#bbf7d0", fontSize: "0.78rem", lineHeight: 1.45 };
const finalPrimaryButtonStyle = { width: "100%", minHeight: "50px", border: "0", borderRadius: "14px", background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: "0.95rem", boxShadow: "0 12px 28px rgba(168,85,247,0.24)" };

const finishConfirmModalStyle = {
  width: "min(100%, 500px)",
  padding: "1.7rem",
  borderRadius: "26px",
  background: "linear-gradient(155deg, #2b1740 0%, #191126 58%, #24142f 100%)",
  border: "1px solid rgba(192,132,252,0.42)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.58), 0 0 55px rgba(168,85,247,0.14)",
  textAlign: "center",
  boxSizing: "border-box",
};
const finishConfirmIconStyle = {
  width: "62px",
  height: "62px",
  margin: "0 auto 0.85rem",
  display: "grid",
  placeItems: "center",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "#fff",
  fontSize: "1.65rem",
  fontWeight: 950,
  boxShadow: "0 14px 32px rgba(168,85,247,0.28)",
};
const finishConfirmEyebrowStyle = { color: "#d8b4fe", fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.13em" };
const finishConfirmTitleStyle = { margin: "0.4rem 0 0.55rem", fontSize: "1.5rem", color: "#fff" };
const finishConfirmTextStyle = { margin: "0 auto 1.3rem", maxWidth: "410px", color: "#c4b5fd", lineHeight: 1.55, fontSize: "0.88rem" };
const finishConfirmActionsStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" };
const finishCancelButtonStyle = { minHeight: "50px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "14px", background: "rgba(255,255,255,0.06)", color: "#e4e4e7", cursor: "pointer", fontWeight: 850 };
const finishConfirmButtonStyle = { minHeight: "50px", border: "0", borderRadius: "14px", background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", cursor: "pointer", fontWeight: 900, boxShadow: "0 10px 25px rgba(168,85,247,0.24)" };

const discardModalStyle = {
  width: "min(100%, 500px)",
  padding: "1.7rem",
  borderRadius: "26px",
  background: "linear-gradient(155deg, #2b1740 0%, #191126 58%, #24142f 100%)",
  border: "1px solid rgba(192,132,252,0.42)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.58), 0 0 55px rgba(168,85,247,0.14)",
  textAlign: "center",
  boxSizing: "border-box",
};
const discardModalIconStyle = {
  width: "62px",
  height: "62px",
  margin: "0 auto 0.85rem",
  display: "grid",
  placeItems: "center",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "#fff",
  fontSize: "1.65rem",
  fontWeight: 950,
  boxShadow: "0 14px 32px rgba(168,85,247,0.28)",
};
const discardModalEyebrowStyle = { color: "#d8b4fe", fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.13em" };
const discardModalTitleStyle = { margin: "0.4rem 0 0.55rem", fontSize: "1.5rem", color: "#fff" };
const discardModalTextStyle = { margin: "0 auto 1.3rem", maxWidth: "410px", color: "#c4b5fd", lineHeight: 1.55, fontSize: "0.88rem" };
const discardActionsStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" };
const discardContinueButtonStyle = { minHeight: "50px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "14px", background: "rgba(255,255,255,0.06)", color: "#e4e4e7", cursor: "pointer", fontWeight: 850 };
const discardConfirmButtonStyle = { minHeight: "50px", border: "0", borderRadius: "14px", background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", cursor: "pointer", fontWeight: 900, boxShadow: "0 10px 25px rgba(168,85,247,0.24)" };

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: "1rem",
  background: "radial-gradient(circle at 50% 35%, rgba(168,85,247,0.16), rgba(12,8,20,0.76) 62%, rgba(5,4,10,0.82))",
  backdropFilter: "blur(12px)",
};

const modalStyle = {
  width: "min(100%, 430px)",
  background: "linear-gradient(145deg, #21122f, #120c1b)",
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: "20px",
  padding: "1.4rem",
  boxShadow: "0 25px 70px rgba(0,0,0,0.55)",
  boxSizing: "border-box",
};

const modalIconStyle = {
  width: "48px",
  height: "48px",
  display: "grid",
  placeItems: "center",
  borderRadius: "14px",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.25)",
  fontSize: "1.35rem",
  marginBottom: "0.8rem",
};