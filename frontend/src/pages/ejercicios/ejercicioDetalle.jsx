
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getHistorial } from "../../utils/rutinasStorage";
import "../../css/ejercicioDetalle.css";

const nombresGrupos = {
  chest: "Pecho",
  back: "Espalda",
  upper_legs: "Piernas",
  lower_legs: "Pantorrillas",
  shoulders: "Hombros",
  upper_arms: "Brazos",
  lower_arms: "Antebrazos",
  core: "Core",
  full_body: "Cuerpo completo",
};

const nombresMusculos = {
  rectus_abdominis: "Recto abdominal",
  transverse_abdominis: "Transverso abdominal",
  obliques: "Oblicuos",
  anterior_deltoid: "Deltoides anterior",
  lateral_deltoid: "Deltoides lateral",
  posterior_deltoid: "Deltoides posterior",
  pectoralis_major: "Pectoral mayor",
  latissimus_dorsi: "Dorsal ancho",
  trapezius: "Trapecio",
  biceps_brachii: "Bíceps",
  triceps_brachii: "Tríceps",
  brachialis: "Braquial",
  brachioradialis: "Braquiorradial",
  gluteus_maximus: "Glúteo mayor",
  gluteus_medius: "Glúteo medio",
  quadriceps: "Cuádriceps",
  hamstrings: "Isquiotibiales",
  calves: "Pantorrillas",
  gastrocnemius: "Gastrocnemio",
  soleus: "Sóleo",
  hip_flexors: "Flexores de cadera",
  adductors: "Aductores",
  abductors: "Abductores",
  erector_spinae: "Erectores espinales",
  serratus_anterior: "Serrato anterior",
  forearms: "Antebrazos",
};

function traducirMusculo(musculo) {
  if (typeof musculo !== "string") return String(musculo ?? "");
  return nombresMusculos[musculo] || musculo.replaceAll("_", " ");
}

function normalizarNombre(nombre = "") {
  return String(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numeroValido(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function obtenerPesoKg(serie, ejercicioEntrenamiento) {
  const pesoKg = numeroValido(serie.pesoKg);

  if (pesoKg !== null) return pesoKg;

  const peso = numeroValido(serie.peso);
  if (peso === null) return null;

  const unidad = String(ejercicioEntrenamiento?.unidadPeso || "kg")
    .toLowerCase()
    .trim();

  if (["lb", "lbs", "libra", "libras"].includes(unidad)) {
    return peso / 2.2046226218;
  }

  return peso;
}

function formatearFecha(fecha, incluirHora = false) {
  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "Fecha desconocida";

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function formatearKg(valor, decimales = 1) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "Sin datos";
  }

  return `${Number(valor.toFixed(decimales))} kg`;
}

function obtenerMesClave(fecha) {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatearMes(clave) {
  const [anio, mes] = clave.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, 1);

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "2-digit",
  })
    .format(fecha)
    .replace(".", "");
}

function obtenerListaMusculos(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

function construirEstadisticas(historial, nombreEjercicio) {
  const nombreNormalizado = normalizarNombre(nombreEjercicio);
  const series = [];

  historial.forEach((entrenamiento) => {
    const fecha = entrenamiento?.fecha;

    if (!fecha || Number.isNaN(new Date(fecha).getTime())) return;

    const ejerciciosEntrenados = Array.isArray(entrenamiento?.ejercicios)
      ? entrenamiento.ejercicios
      : [];

    ejerciciosEntrenados.forEach((ejercicioEntrenamiento) => {
      if (
        normalizarNombre(ejercicioEntrenamiento?.nombre) !==
        nombreNormalizado
      ) {
        return;
      }

      if (ejercicioEntrenamiento?.porTiempo) return;

      const seriesEntrenamiento = Array.isArray(ejercicioEntrenamiento?.sets)
        ? ejercicioEntrenamiento.sets
        : [];

      seriesEntrenamiento.forEach((serie) => {
        if (serie?.hecho !== true) return;

        const pesoKg = obtenerPesoKg(serie, ejercicioEntrenamiento);
        const reps = numeroValido(serie.reps);

        if (pesoKg === null || reps === null || reps <= 0) return;

        series.push({
          fecha,
          mes: obtenerMesClave(fecha),
          pesoKg,
          reps,
          volumen: pesoKg * reps,
          unaRm: pesoKg > 0 ? pesoKg * (1 + reps / 30) : null,
        });
      });
    });
  });

  const mayorPeso = series.reduce(
    (mejor, serie) =>
      !mejor || serie.pesoKg > mejor.pesoKg ? serie : mejor,
    null
  );

  const mejorUnaRm = series.reduce(
    (mejor, serie) =>
      serie.unaRm !== null &&
      (!mejor || serie.unaRm > mejor.unaRm)
        ? serie
        : mejor,
    null
  );

  const mayorVolumenSerie = series.reduce(
    (mejor, serie) =>
      !mejor || serie.volumen > mejor.volumen ? serie : mejor,
    null
  );

  const volumenPorSesion = new Map();

  series.forEach((serie) => {
    const clave = `${serie.fecha}::${obtenerMesClave(serie.fecha)}`;
    const actual = volumenPorSesion.get(clave);

    if (actual) {
      actual.volumen += serie.volumen;
      actual.fecha = serie.fecha;
    } else {
      volumenPorSesion.set(clave, {
        fecha: serie.fecha,
        volumen: serie.volumen,
      });
    }
  });

  const mayorVolumenSesion = [...volumenPorSesion.values()].reduce(
    (mejor, sesion) =>
      !mejor || sesion.volumen > mejor.volumen ? sesion : mejor,
    null
  );

  const pesoMaximoPorMes = new Map();

  series.forEach((serie) => {
    if (!serie.mes) return;

    const actual = pesoMaximoPorMes.get(serie.mes);

    if (!actual || serie.pesoKg > actual.pesoKg) {
      pesoMaximoPorMes.set(serie.mes, {
        mes: serie.mes,
        etiqueta: formatearMes(serie.mes),
        pesoKg: serie.pesoKg,
        fecha: serie.fecha,
      });
    }
  });

  const grafica = [...pesoMaximoPorMes.values()].sort((a, b) =>
    a.mes.localeCompare(b.mes)
  );

  return {
    series,
    mayorPeso,
    mejorUnaRm,
    mayorVolumenSerie,
    mayorVolumenSesion,
    grafica,
  };
}

function TarjetaRecord({ icono, titulo, valor, detalle }) {
  return (
    <article className="ej-detalle-record">
      <div className="ej-detalle-record-icon" aria-hidden="true">
        {icono}
      </div>
      <div className="ej-detalle-record-text">
        <p className="ej-detalle-record-title">{titulo}</p>
        <strong>{valor}</strong>
        {detalle && <span>{detalle}</span>}
      </div>
    </article>
  );
}

function TarjetaMusculos({ tipo, icono, titulo, subtitulo, musculos }) {
  return (
    <article className={`ej-detalle-muscle-card ${tipo}`}>
      <div className="ej-detalle-muscle-heading">
        <span className="ej-detalle-muscle-icon" aria-hidden="true">
          {icono}
        </span>
        <div>
          <h3>{titulo}</h3>
          <p>{subtitulo}</p>
        </div>
      </div>

      <div className="ej-detalle-tags">
        {musculos.length > 0 ? (
          musculos.map((musculo, index) => (
            <span className="ej-detalle-tag" key={`${musculo}-${index}`}>
              {traducirMusculo(musculo)}
            </span>
          ))
        ) : (
          <span className="ej-detalle-empty">No especificado</span>
        )}
      </div>
    </article>
  );
}

export default function EjercicioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ejercicio, setEjercicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenActiva, setImagenActiva] = useState("inicio");
  const [historial] = useState(() => {
    try {
      return getHistorial();
    } catch (error) {
      console.error("No se pudo leer el historial local:", error);
      return [];
    }
  });

  useEffect(() => {
    let activo = true;

    const cargarEjercicio = async () => {
      try {
        setCargando(true);
        setError("");

        const response = await fetch("http://127.0.0.1:8000/api/ejercicios/");

        if (!response.ok) {
          throw new Error("No se pudieron cargar los ejercicios");
        }

        const data = await response.json();
        const lista = Array.isArray(data) ? data : data.results || [];

        const encontrado = lista.find(
          (item) => Number(item.id) === Number(id)
        );

        if (!activo) return;

        if (!encontrado) {
          setEjercicio(null);
          setError("Ejercicio no encontrado");
          return;
        }

        setEjercicio(encontrado);
      } catch (error) {
        console.error("Error al cargar ejercicio:", error);
        if (activo) setError("No se pudo cargar el ejercicio.");
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarEjercicio();

    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    if (!ejercicio?.imagen_inicio || !ejercicio?.imagen_final) {
      return undefined;
    }

    const intervalo = setInterval(() => {
      setImagenActiva((actual) =>
        actual === "inicio" ? "final" : "inicio"
      );
    }, 1200);

    return () => clearInterval(intervalo);
  }, [ejercicio]);

  const estadisticas = useMemo(
    () => construirEstadisticas(historial, ejercicio?.nombre || ""),
    [historial, ejercicio?.nombre]
  );

  if (cargando) {
    return (
      <div className="ej-detalle-page">
        <div className="ej-detalle-state">
          <div className="ej-detalle-spinner" />
          <p>Cargando ejercicio...</p>
        </div>
      </div>
    );
  }

  if (error || !ejercicio) {
    return (
      <div className="ej-detalle-page">
        <div className="ej-detalle-state ej-detalle-state-error">
          <div className="ej-detalle-error-icon">!</div>
          <h2>{error || "Ejercicio no encontrado"}</h2>
          <button
            type="button"
            className="ej-detalle-button"
            onClick={() => navigate("/ejercicios")}
          >
            ← Volver a ejercicios
          </button>
        </div>
      </div>
    );
  }

  const {
    nombre,
    grupo,
    descripcion,
    imagen_inicio,
    imagen_final,
    musculos_principales,
    musculos_secundarios,
    musculos_terciarios,
  } = ejercicio;

  const principales = obtenerListaMusculos(musculos_principales);
  const secundarios = obtenerListaMusculos(musculos_secundarios);
  const terciarios = obtenerListaMusculos(musculos_terciarios);
  const grupoNombre = nombresGrupos[grupo] || grupo || "Ejercicio";

  const imagenMostrar =
    imagenActiva === "final" && imagen_final ? imagen_final : imagen_inicio;

  const {
    mayorPeso,
    mejorUnaRm,
    mayorVolumenSerie,
    mayorVolumenSesion,
    grafica,
    series,
  } = estadisticas;

  return (
    <div className="ej-detalle-page">
      <div className="ej-detalle-wrapper">
        <button
          type="button"
          className="ej-detalle-back"
          onClick={() => navigate("/ejercicios")}
        >
          <span aria-hidden="true">←</span>
          Volver a ejercicios
        </button>

        <main>
          <section className="ej-detalle-hero">
            <div className="ej-detalle-visual">
              <div className="ej-detalle-image-wrapper">
                {imagenMostrar ? (
                  <img
                    src={imagenMostrar}
                    alt={nombre}
                    className="ej-detalle-image"
                  />
                ) : (
                  <div className="ej-detalle-image-placeholder">
                    <span aria-hidden="true">🏋️</span>
                    <p>Imagen no disponible</p>
                  </div>
                )}

                {imagen_inicio && imagen_final && (
                  <div className="ej-detalle-image-badge">
                    <span />
                    Movimiento automático
                  </div>
                )}
              </div>
            </div>

            <div className="ej-detalle-info">
              <div className="ej-detalle-heading">
                <span className="ej-detalle-overline">
                  BODY RHYTHM · EJERCICIO
                </span>
                <h1>{nombre}</h1>
                <span className="ej-detalle-group">{grupoNombre}</span>
              </div>

              <div className="ej-detalle-description">
                <h2>Descripción</h2>
                <p>
                  {descripcion ||
                    "No hay una descripción disponible para este ejercicio."}
                </p>
              </div>

              <div className="ej-detalle-muscles">
                <TarjetaMusculos
                  tipo="primary"
                  icono="●"
                  titulo="Músculos principales"
                  subtitulo="Trabajo principal"
                  musculos={principales}
                />
                <TarjetaMusculos
                  tipo="secondary"
                  icono="◉"
                  titulo="Músculos secundarios"
                  subtitulo="Trabajo complementario"
                  musculos={secundarios}
                />
                {terciarios.length > 0 && (
                  <TarjetaMusculos
                    tipo="tertiary"
                    icono="○"
                    titulo="Músculos terciarios"
                    subtitulo="Participación adicional"
                    musculos={terciarios}
                  />
                )}
              </div>

              <div className="ej-detalle-action">
                <button
                  type="button"
                  className="ej-detalle-button"
                  onClick={() => {
                    navigate("/rutinas", {
                      state: {
                        ejercicioSeleccionado: ejercicio,
                      },
                    });
                  }}
                >
                  <span aria-hidden="true">+</span>
                  Agregar a mi rutina
                  <span className="ej-detalle-button-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="ej-detalle-progress">
            <div className="ej-detalle-section-heading">
              <div>
                <span className="ej-detalle-overline">TU RENDIMIENTO</span>
                <h2>Récords personales</h2>
                <p>
                  Datos calculados a partir de tus series completadas guardadas
                  en este dispositivo.
                </p>
              </div>
              <span className="ej-detalle-count">
                {series.length}{" "}
                {series.length === 1 ? "serie válida" : "series válidas"}
              </span>
            </div>

            <div className="ej-detalle-record-grid">
              <TarjetaRecord
                icono="🏆"
                titulo="Mayor peso levantado"
                valor={mayorPeso ? formatearKg(mayorPeso.pesoKg) : "Sin datos"}
                detalle={
                  mayorPeso
                    ? formatearFecha(mayorPeso.fecha)
                    : "Completa una serie con peso"
                }
              />
              <TarjetaRecord
                icono="⚡"
                titulo="Mejor 1RM estimado"
                valor={
                  mejorUnaRm ? formatearKg(mejorUnaRm.unaRm) : "Sin datos"
                }
                detalle={
                  mejorUnaRm
                    ? `${mejorUnaRm.reps} repeticiones · ${formatearFecha(mejorUnaRm.fecha)}`
                    : "Estimación basada en peso y repeticiones"
                }
              />
              <TarjetaRecord
                icono="📈"
                titulo="Mayor volumen en una serie"
                valor={
                  mayorVolumenSerie
                    ? `${Math.round(mayorVolumenSerie.volumen).toLocaleString("es-CO")} kg·rep`
                    : "Sin datos"
                }
                detalle={
                  mayorVolumenSerie
                    ? `${formatearKg(mayorVolumenSerie.pesoKg)} × ${mayorVolumenSerie.reps} reps`
                    : "Peso × repeticiones"
                }
              />
              <TarjetaRecord
                icono="🔥"
                titulo="Mayor volumen en una sesión"
                valor={
                  mayorVolumenSesion
                    ? `${Math.round(mayorVolumenSesion.volumen).toLocaleString("es-CO")} kg·rep`
                    : "Sin datos"
                }
                detalle={
                  mayorVolumenSesion
                    ? formatearFecha(mayorVolumenSesion.fecha)
                    : "Suma de tus series completadas"
                }
              />
            </div>

            <article className="ej-detalle-chart-card">
              <div className="ej-detalle-chart-heading">
                <div>
                  <h3>Evolución del peso</h3>
                  <p>Tu mayor peso registrado en cada mes</p>
                </div>
                <span className="ej-detalle-chart-unit">Kilogramos (kg)</span>
              </div>

              {grafica.length > 0 ? (
                <div className="ej-detalle-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={grafica}
                      margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="etiqueta"
                        tick={{ fill: "#a6a4b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                        tickLine={false}
                      />
                      <YAxis
                        width={48}
                        tick={{ fill: "#a6a4b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(valor) => `${valor} kg`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#191724",
                          border: "1px solid rgba(167, 115, 255, 0.35)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                        labelStyle={{
                          color: "#d9c4ff",
                          marginBottom: 6,
                        }}
                        formatter={(valor) => [
                          `${Number(valor).toLocaleString("es-CO", {
                            maximumFractionDigits: 1,
                          })} kg`,
                          "Mayor peso",
                        ]}
                        labelFormatter={(etiqueta, elementos) => {
                          const punto = elementos?.[0]?.payload;
                          return punto
                            ? `${etiqueta} · ${formatearFecha(punto.fecha)}`
                            : etiqueta;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pesoKg"
                        name="Mayor peso"
                        stroke="#a970ff"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#a970ff",
                          stroke: "#211a32",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="ej-detalle-chart-empty">
                  <span aria-hidden="true">📊</span>
                  <h4>Aún no hay progreso registrado</h4>
                  <p>
                    Cuando guardes entrenamientos con series completadas, tu
                    evolución mensual aparecerá aquí.
                  </p>
                </div>
              )}

              <p className="ej-detalle-chart-note">
                La gráfica muestra el peso máximo registrado por mes. Los meses
                sin registros no se rellenan con valores ficticios.
              </p>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
