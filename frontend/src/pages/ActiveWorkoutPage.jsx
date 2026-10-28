import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { guardarEntrenamiento } from "../utils/rutinasStorage";
import "../css/entrenamiento-activo.css";

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

// "Anterior" como en Hevy/Strong: la serie N muestra la serie N de la última vez
// que hiciste ese ejercicio, en cualquier rutina (lo da /entrenamientos/anterior/).
function aplicarAnterior(ejercicios, anteriores) {
  return ejercicios.map((ej) => {
    const anterior = anteriores[ej.nombre];
    if (!anterior) return ej;
    return {
      ...ej,
      sets: ej.sets.map((serie, i) => {
        const previa = anterior.series[i];
        if (!previa) return serie;
        return {
          ...serie,
          anteriorPeso: previa.peso ?? previa.peso_kg ?? "",
          anteriorPesoKg: previa.peso_kg ?? "",
          anteriorUnidadPeso: anterior.unidad_peso || "kg",
          anteriorReps: previa.reps ?? "",
          anteriorDuracion: previa.duracion_segundos ?? "",
        };
      }),
    };
  });
}

function cargarAnterior(nombres, alCargar) {
  if (!nombres.length) return;
  api
    .get("/entrenamientos/anterior/", { params: { nombres: nombres.join("|") } })
    .then((res) => alCargar(res.data))
    .catch(() => {}); // sin conexión se queda con lo guardado en este navegador
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
  const ejerciciosTemporales = state?.ejerciciosTemporales || [];

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
  const [ejercicioAEliminar, setEjercicioAEliminar] = useState(null);

  const [ejercicios, setEjercicios] = useState(() => {
  const detalles = rutina?.ejercicios_detalle?.length
    ? rutina.ejercicios_detalle
    : ejerciciosTemporales;

  if (!detalles.length) return progresoInicial?.ejercicios || [];

  return detalles.map((detalle) => {
      const info = detalle.ejercicio || {};
      const porTiempo = esEjercicioPorTiempo(info);
      const guardado = progresoInicial?.ejercicios?.find(
        (item) => String(item.id) === String(detalle.id) || item.nombre === info.nombre
      );

      const unidadPlanificada = detalle.unidad_peso === "lb" ? "lb" : "kg";
      const unidadInicial = guardado?.unidadPeso || unidadPlanificada;

      const configuracionPlanificada = Array.isArray(detalle.configuracion_series)
        ? detalle.configuracion_series
        : [];

      const setsBase = configuracionPlanificada.length
        ? configuracionPlanificada.map((serie, index) => {
            const pesoKg = porTiempo
              ? ""
              : convertirPesoAKg(serie.peso, unidadPlanificada);

            const repsPlanificadas =
              Number(serie.repeticiones) > 0
                ? Number(serie.repeticiones)
                : Number(detalle.repeticiones) || 10;

            return {
              ...crearSerie(
                index + 1,
                porTiempo ? 0 : repsPlanificadas,
                porTiempo,
                obtenerDuracionInicial(info, detalle)
              ),
              tipo: ["normal", "calentamiento", "fallo", "drop"].includes(serie.tipo)
                ? serie.tipo
                : "normal",
              reps: porTiempo ? 0 : repsPlanificadas,
              pesoKg,
              peso: porTiempo
                ? ""
                : convertirPesoParaMostrar(pesoKg, unidadInicial),
            };
          })
        : crearSets(
            detalle.series || 3,
            detalle.repeticiones || 10,
            porTiempo,
            obtenerDuracionInicial(info, detalle)
          );


      const setsGuardados = guardado?.sets || [];

      const sets = setsBase.map((seriePlanificada, index) => {
        const serieGuardada = setsGuardados[index];

        if (!serieGuardada) {
          return {
            ...seriePlanificada,
            numero: index + 1,
            hecho: false,
          };
        }

        const pesoGuardadoKg =
          serieGuardada.pesoKg !== undefined &&
          serieGuardada.pesoKg !== null &&
          serieGuardada.pesoKg !== ""
            ? convertirPesoAKg(serieGuardada.pesoKg, "kg")
            : convertirPesoAKg(
                serieGuardada.peso,
                guardado?.unidadPeso || unidadInicial
              );

        const tienePesoPlanificado =
          seriePlanificada.pesoKg !== "" &&
          seriePlanificada.pesoKg !== null &&
          seriePlanificada.pesoKg !== undefined;

        const pesoFinalKg = tienePesoPlanificado
          ? seriePlanificada.pesoKg
          : pesoGuardadoKg;

        return {
          ...seriePlanificada,
          numero: index + 1,
          tipo: seriePlanificada.tipo,
          reps: seriePlanificada.reps,
          pesoKg: porTiempo ? "" : pesoFinalKg,
          peso: porTiempo
            ? ""
            : convertirPesoParaMostrar(pesoFinalKg, unidadInicial),
          duracion: porTiempo
            ? Number(serieGuardada.duracion) ||
              seriePlanificada.duracion
            : 0,
          anteriorPeso: serieGuardada.anteriorPeso ?? "",
          anteriorPesoKg: serieGuardada.anteriorPesoKg ?? "",
          anteriorUnidadPeso: serieGuardada.anteriorUnidadPeso ?? "kg",
          anteriorReps: serieGuardada.anteriorReps ?? "",
          anteriorDuracion: serieGuardada.anteriorDuracion ?? "",
          hecho: false,
        };
      });


      return {
        id: detalle.id,
        nombre: info.nombre || "Ejercicio",
        grupo: info.grupo_muscular || "",
        porTiempo,
        unidadPeso: unidadInicial,
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

    cargarAnterior(
      ejercicios.map((ej) => ej.nombre),
      (anteriores) => setEjercicios((prev) => aplicarAnterior(prev, anteriores))
    );

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
    setMenuEjercicioAbierto(null);
    setEjercicioAEliminar(idx);
  };

  const confirmarEliminarEjercicio = () => {
    if (ejercicioAEliminar === null) return;
    setEjercicios((prev) => prev.filter((_, i) => i !== ejercicioAEliminar));
    setEjercicioAEliminar(null);
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

    cargarAnterior([info.nombre], (anteriores) => setEjercicios((prev) => aplicarAnterior(prev, anteriores)));

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

    // También se guarda en el backend para el perfil y el feed de seguidores.
    // Si falla, el entrenamiento queda igual en el historial local.
    api
      .post("/entrenamientos/registros/", {
        nombre: resumen.nombre || "Entrenamiento",
        fecha: resumen.fecha,
        duracion_segundos: resumen.duracionSeg,
        ejercicios: resumen.ejercicios,
        // Solo las rutinas guardadas tienen id numérico (las vacías no)
        rutina_id: Number.isInteger(rutina?.id) ? rutina.id : null,
      })
      .then((res) => setFinalizado((actual) => (actual ? { ...actual, records: res.data.records || [] } : actual)))
      .catch((error) => console.error("No se pudo publicar el entrenamiento:", error));
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
        <main className="aw-page aw-final">
          <section className="aw-glass aw-final-card">
            <span className="aw-final-check" aria-hidden="true"><IconoCheck size={30} /></span>
            <p className="aw-sobretitulo">Entrenamiento terminado</p>
            <h1>Buen trabajo</h1>
            <p className="aw-final-nombre">{finalizado.nombre}</p>

            <dl className="aw-final-stats">
              <div>
                <dt>Duración</dt>
                <dd>{formatearTiempo(finalizado.duracionSeg)}</dd>
              </div>
              <div>
                <dt>Series</dt>
                <dd>{finalizado.setsCompletados}/{finalizado.setsTotales}</dd>
              </div>
            </dl>

            {finalizado.records?.length > 0 && (
              <div className="aw-records">
                <p className="aw-records-titulo">
                  {finalizado.records.length === 1 ? "Nuevo récord personal" : `${finalizado.records.length} récords personales`}
                </p>
                {finalizado.records.map((record) => (
                  <div key={record.ejercicio} className="aw-record">
                    <span>{record.ejercicio}</span>
                    <span>
                      <strong>
                        {record.tipo === "peso" && `${redondearPeso(record.valor, 2)} kg`}
                        {record.tipo === "reps" && `${record.valor} reps`}
                        {record.tipo === "tiempo" && formatearTiempo(record.valor)}
                      </strong>
                      <small>
                        {" "}antes {record.tipo === "peso" ? `${redondearPeso(record.anterior, 2)} kg` : record.tipo === "reps" ? `${record.anterior} reps` : formatearTiempo(record.anterior)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="aw-nota">Tus pesos, descansos y tiempos quedaron guardados para la próxima sesión.</p>

            <button type="button" onClick={() => navigate("/rutinas")} className="aw-btn primario aw-btn-ancho">
              Volver a mis rutinas
            </button>
          </section>
        </main>
      </>
    );
  }

  const progreso = totalSets ? Math.round((setsHechos / totalSets) * 100) : 0;

  return (
    <>
      <Navbar />

      <main className="aw-page">
        <div className="aw-contenedor">
          {/* CABECERA */}
          <header className="aw-cabecera">
            <div className="aw-cabecera-texto">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="aw-titulo"
                aria-label="Nombre del entrenamiento"
              />
              <p className="aw-resumen">
                <span className="aw-reloj">{formatearTiempo(segundosTranscurridos)}</span>
                <span>{setsHechos} de {totalSets} series</span>
              </p>
            </div>

            <div className="aw-acciones">
              <button type="button" onClick={descartar} className="aw-btn">Descartar</button>
              <button type="button" onClick={finalizar} className="aw-btn primario">Finalizar</button>
            </div>
          </header>

          <div className="aw-progreso" role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progreso}%` }} />
          </div>

          {ejercicios.length === 0 && (
            <p className="aw-vacio">Agrega un ejercicio para empezar.</p>
          )}

          {/* EJERCICIOS */}
          {ejercicios.map((ej, ejIdx) => (
            <section key={ej.id} className="aw-glass aw-ejercicio">
              <div className="aw-ejercicio-cabecera">
                <div className="aw-ejercicio-nombre">
                  <h3>{ej.nombre}</h3>
                  {ej.grupo && <span>{ej.grupo}</span>}
                </div>

                <div className="aw-ejercicio-controles">
                  {ej.porTiempo ? (
                    <span className="aw-chip">Por tiempo</span>
                  ) : (
                    <div className="aw-segmentado" role="group" aria-label="Unidad de peso">
                      <button type="button" onClick={() => cambiarUnidadPeso(ejIdx, "kg")} className={ej.unidadPeso === "kg" ? "activo" : ""}>kg</button>
                      <button type="button" onClick={() => cambiarUnidadPeso(ejIdx, "lb")} className={ej.unidadPeso === "lb" ? "activo" : ""}>lb</button>
                    </div>
                  )}

                  <div className="aw-menu-wrap">
                    <button
                      type="button"
                      onClick={() => setMenuEjercicioAbierto(menuEjercicioAbierto === ejIdx ? null : ejIdx)}
                      className="aw-icono-btn"
                      aria-label="Opciones del ejercicio"
                      aria-expanded={menuEjercicioAbierto === ejIdx}
                    >
                      <IconoMas />
                    </button>

                    {menuEjercicioAbierto === ejIdx && (
                      <div className="aw-menu">
                        <button type="button" disabled={ejIdx === 0} onClick={() => moverEjercicio(ejIdx, -1)}>
                          Mover arriba
                        </button>
                        <button type="button" disabled={ejIdx === ejercicios.length - 1} onClick={() => moverEjercicio(ejIdx, 1)}>
                          Mover abajo
                        </button>
                        <button type="button" className="peligro" onClick={() => eliminarEjercicio(ejIdx)}>
                          Quitar ejercicio
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DESCANSO: abre el selector tipo rueda */}
              <button
                type="button"
                onClick={() => {
                  const valorActual = Math.min(600, Math.max(15, Math.round((Number(ej.descanso) || 60) / 15) * 15));
                  setTiempoDescansoPicker(valorActual);
                  setMenuDescansoAbierto(ejIdx);
                }}
                className="aw-descanso-btn"
                aria-expanded={menuDescansoAbierto === ejIdx}
              >
                Descanso <strong>{formatearTiempo(Number(ej.descanso) || 0)}</strong>
              </button>

              {menuDescansoAbierto === ejIdx && createPortal(
                <div className="aw-hoja-overlay" role="dialog" aria-modal="true" aria-label="Temporizador de descanso">
                  <div className="aw-hoja-fondo" onClick={() => setMenuDescansoAbierto(null)} aria-hidden="true" />
                  <div className="aw-hoja">
                    <div className="aw-hoja-cabecera">
                      <h3>Descanso</h3>
                      <p>{ej.nombre}</p>
                    </div>

                    <div
                      ref={descansoPickerRef}
                      className="aw-rueda"
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
                      <div className="aw-rueda-espacio" />
                      {Array.from({ length: 40 }, (_, index) => (index + 1) * 15).map((segundos) => {
                        const activa = tiempoDescansoPicker === segundos;
                        const label = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
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
                            className={`aw-rueda-item${activa ? " activa" : ""}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                      <div className="aw-rueda-espacio" />
                      <div className="aw-rueda-seleccion" aria-hidden="true" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        actualizarDescanso(ejIdx, tiempoDescansoPicker / 60);
                        setMenuDescansoAbierto(null);
                      }}
                      className="aw-btn primario aw-btn-ancho aw-btn-grande"
                    >
                      Listo
                    </button>
                  </div>
                </div>,
                document.body
              )}

              {/* TABLA DE SERIES */}
              <div className={`aw-fila aw-fila-titulos${ej.porTiempo ? " tiempo" : ""}`}>
                <span>Serie</span>
                <span>Anterior</span>
                {ej.porTiempo ? <span>Tiempo</span> : <><span>{ej.unidadPeso || "kg"}</span><span>Reps</span></>}
                <span />
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
                  <div key={serieKey} className="aw-serie">
                    <div className={`aw-fila${ej.porTiempo ? " tiempo" : ""}${serie.hecho ? " hecha" : ""}`}>
                      {/* TIPO DE SERIE */}
                      <div className="aw-menu-wrap aw-centro">
                        <button
                          type="button"
                          onClick={() => setMenuSerieAbierto(menuSerieAbierto === serieKey ? null : serieKey)}
                          className={`aw-numero tipo-${serie.tipo || "normal"}`}
                          aria-label={`Tipo de serie: ${tipoConfig.nombre}`}
                        >
                          {etiqueta}
                        </button>

                        {menuSerieAbierto === serieKey && (
                          <div className="aw-menu aw-menu-serie">
                            {MENU_SERIE.map((opcion) => (
                              <button
                                key={opcion.tipo}
                                type="button"
                                onClick={() => cambiarTipoSerie(ejIdx, setIdx, opcion.tipo)}
                                className={serie.tipo === opcion.tipo ? "activo" : ""}
                              >
                                <span className={`aw-numero mini tipo-${opcion.tipo}`}>
                                  {opcion.tipo === "normal" ? setIdx + 1 : opcion.etiqueta}
                                </span>
                                {opcion.nombre.replace("Serie de ", "").replace("Serie al ", "").replace("Serie ", "")}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="peligro"
                              disabled={ej.sets.length <= 1}
                              onClick={() => eliminarSerie(ejIdx, setIdx)}
                            >
                              Eliminar serie
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ANTERIOR */}
                      <span className="aw-anterior">
                        {ej.porTiempo
                          ? serie.anteriorDuracion
                            ? formatearTiempo(serie.anteriorDuracion)
                            : "–"
                          : serie.anteriorPeso || serie.anteriorPesoKg || serie.anteriorReps
                            ? `${convertirPesoParaMostrar(
                                serie.anteriorPesoKg !== "" && serie.anteriorPesoKg !== null && serie.anteriorPesoKg !== undefined
                                  ? serie.anteriorPesoKg
                                  : convertirPesoAKg(serie.anteriorPeso, serie.anteriorUnidadPeso || ej.unidadPeso || "kg"),
                                ej.unidadPeso || "kg"
                              ) || 0} × ${serie.anteriorReps || 0}`
                            : "–"}
                      </span>

                      {/* TIEMPO / PESO */}
                      {ej.porTiempo ? (
                        <div className="aw-cronometro">
                          <button
                            type="button"
                            onClick={() => {
                              if (serie.hecho) return;
                              if (timerActivo) pausarCronometro(ejIdx, setIdx);
                              else iniciarCronometro(ejIdx, setIdx);
                            }}
                            disabled={serie.hecho}
                            className="aw-icono-btn"
                            aria-label={timerActivo ? "Pausar cronómetro" : "Iniciar cronómetro"}
                          >
                            {timerActivo ? <IconoPausa /> : <IconoPlay />}
                          </button>
                          <span className="aw-cronometro-tiempo">{formatearTiempo(tiempo)}</span>
                          <button
                            type="button"
                            onClick={() => reiniciarCronometro(ejIdx, setIdx)}
                            disabled={serie.hecho}
                            className="aw-icono-btn"
                            aria-label="Reiniciar cronómetro"
                            title="Reiniciar"
                          >
                            <IconoReiniciar />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={serie.peso}
                            placeholder="0"
                            onChange={(e) => actualizarSet(ejIdx, setIdx, "peso", e.target.value)}
                            className="aw-input"
                            aria-label={`Peso de la serie ${setIdx + 1}`}
                          />
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={serie.reps}
                            onChange={(e) => actualizarSet(ejIdx, setIdx, "reps", e.target.value)}
                            className="aw-input"
                            aria-label={`Repeticiones de la serie ${setIdx + 1}`}
                          />
                        </>
                      )}

                      {/* COMPLETAR */}
                      <button
                        type="button"
                        onClick={() => toggleSet(ejIdx, setIdx)}
                        className={`aw-check${serie.hecho ? " hecho" : ""}`}
                        aria-label={serie.hecho ? "Desmarcar serie" : "Completar serie"}
                        aria-pressed={serie.hecho}
                      >
                        <IconoCheck />
                      </button>
                    </div>

                    {descansoActual && (
                      <div className="aw-descanso">
                        <span className="aw-descanso-texto">Descanso</span>
                        <strong className="aw-descanso-tiempo">{formatearTiempo(descansoActual.restante)}</strong>
                        <div className="aw-descanso-acciones">
                          <button
                            type="button"
                            onClick={() => setDescansos((actuales) => ({
                              ...actuales,
                              [serieKey]: {
                                ...actuales[serieKey],
                                restante: Math.max(0, Number(actuales[serieKey]?.restante || 0) - 15),
                              },
                            }))}
                          >
                            −15
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
                          >
                            +15
                          </button>
                          <button
                            type="button"
                            className="saltar"
                            onClick={() => setDescansos((actuales) => {
                              const siguiente = { ...actuales };
                              delete siguiente[serieKey];
                              return siguiente;
                            })}
                          >
                            Saltar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={() => agregarSerie(ejIdx)} className="aw-agregar-serie">
                Añadir serie
              </button>
            </section>
          ))}

          {/* AGREGAR EJERCICIO */}
          {mostrarAgregar ? (
            <section className="aw-glass aw-agregar">
              <button
                type="button"
                onClick={() => setSelectorAbierto((abierto) => !abierto)}
                className="aw-selector"
                aria-expanded={selectorAbierto}
              >
                <span>
                  <strong>{ejercicioSeleccionadoInfo?.nombre || "Seleccionar ejercicio"}</strong>
                  <small>
                    {ejercicioSeleccionadoInfo ? (ejercicioSeleccionadoInfo.grupo_muscular || "Ejercicio") : "Elige un ejercicio para añadirlo"}
                  </small>
                </span>
                <span className={`aw-chevron${selectorAbierto ? " abierto" : ""}`} aria-hidden="true">›</span>
              </button>

              {selectorAbierto && (
                <div className="aw-selector-menu">
                  <input
                    autoFocus
                    value={busquedaEjercicio}
                    onChange={(e) => setBusquedaEjercicio(e.target.value)}
                    placeholder="Buscar ejercicio"
                    className="aw-input aw-buscar"
                  />
                  <div className="aw-selector-lista">
                    {ejerciciosFiltrados.length === 0 ? (
                      <p className="aw-vacio">No encontramos ese ejercicio.</p>
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
                            className={seleccionado ? "activo" : ""}
                          >
                            <span>
                              <strong>{ejercicio.nombre}</strong>
                              <small>{ejercicio.grupo_muscular || "Entrenamiento"}</small>
                            </span>
                            {seleccionado && <IconoCheck />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="aw-agregar-acciones">
                <button type="button" onClick={() => { setMostrarAgregar(false); setSelectorAbierto(false); setBusquedaEjercicio(""); }} className="aw-btn">Cancelar</button>
                <button type="button" onClick={agregarEjercicioCatalogo} className="aw-btn primario">Agregar</button>
              </div>
            </section>
          ) : (
            <button type="button" onClick={() => setMostrarAgregar(true)} className="aw-agregar-ejercicio">
              Añadir ejercicio
            </button>
          )}
        </div>
      </main>

      {mostrarFinalizar && (
        <Alerta
          titulo="¿Finalizar el entrenamiento?"
          texto={totalSets === 0
            ? "Todavía no has agregado ejercicios. Puedes finalizar de todas formas."
            : `Te faltan ${totalSets - setsHechos} serie(s) por completar. Puedes finalizar de todas formas y conservar tus cambios.`}
          cancelar="Seguir entrenando"
          confirmar="Finalizar"
          onCancelar={() => setMostrarFinalizar(false)}
          onConfirmar={ejecutarFinalizacion}
        />
      )}

      {mostrarDescartar && (
        <Alerta
          titulo="¿Descartar la sesión?"
          texto="Saldrás del entrenamiento actual. Tus pesos, descansos y configuraciones ya guardados se conservan para la próxima vez."
          cancelar="Seguir entrenando"
          confirmar="Descartar"
          peligro
          onCancelar={() => setMostrarDescartar(false)}
          onConfirmar={confirmarDescartar}
        />
      )}

      {ejercicioAEliminar !== null && (
        <Alerta
          titulo="¿Quitar este ejercicio?"
          texto={`Se quitará "${ejercicios[ejercicioAEliminar]?.nombre}" de esta sesión junto con sus series.`}
          cancelar="Cancelar"
          confirmar="Quitar"
          peligro
          onCancelar={() => setEjercicioAEliminar(null)}
          onConfirmar={confirmarEliminarEjercicio}
        />
      )}
    </>
  );
}

// ======================================================
// PIEZAS VISUALES
// ======================================================
function IconoCheck({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function IconoMas() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}

function IconoReiniciar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </svg>
  );
}

function IconoPausa() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

// Alerta al estilo iOS: título, texto y dos botones
function Alerta({ titulo, texto, cancelar, confirmar, peligro = false, onCancelar, onConfirmar }) {
  return (
    <div className="aw-alerta-overlay" role="alertdialog" aria-modal="true" aria-label={titulo}>
      <div className="aw-glass aw-alerta">
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="aw-alerta-acciones">
          <button type="button" onClick={onCancelar} className="aw-btn">{cancelar}</button>
          <button type="button" onClick={onConfirmar} className={`aw-btn ${peligro ? "peligro" : "primario"}`}>{confirmar}</button>
        </div>
      </div>
    </div>
  );
}
