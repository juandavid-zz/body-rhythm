import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import api from "../api/api";
import Navbar from "../components/Navbar";
import { tiempoRelativo } from "../utils/formato";
import "../css/rutinas.css";
import { useLocation, useNavigate } from "react-router-dom";

const GRUPOS = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  upper_arms: "Brazos",
  lower_arms: "Antebrazos",
  core: "Core",
  upper_legs: "Piernas",
  lower_legs: "Pantorrillas",
  full_body: "Cuerpo completo",
};

const SWAL = { confirmButtonColor: "#50118c", cancelButtonColor: "#6b7280" };
const POR_DEFECTO = {
  series: 3,
  repeticiones: 10,
  descanso_segundos: 60,
  unidad_peso: "kg",
  notas: "",
};

const TIPOS_SERIE = [
  { valor: "normal", texto: "Normal" },
  { valor: "calentamiento", texto: "Calentamiento" },
  { valor: "fallo", texto: "Al fallo" },
  { valor: "drop", texto: "Drop set" },
];

function crearConfiguracionSeries(cantidad, repeticiones = 10, existentes = []) {
  return Array.from({ length: cantidad }, (_, i) => {
    const serie = existentes[i] || {};
    return {
      tipo: serie.tipo || "normal",
      peso: serie.peso ?? "",
      repeticiones: Number(serie.repeticiones ?? repeticiones) || repeticiones,
    };
  });
}

const grupo = (codigo) => GRUPOS[codigo] || codigo || "";
// "1:30" (minutos) o "45 s": corto para que quepa en el contador del móvil
const formatoDescanso = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`);

// Cada rutina toma un tono suave según el músculo que más trabaja
const TONOS = {
  chest: "superior",
  shoulders: "superior",
  upper_arms: "superior",
  lower_arms: "superior",
  back: "espalda",
  core: "core",
  upper_legs: "piernas",
  lower_legs: "piernas",
};

// Grupos de la rutina ordenados del más frecuente al menos
function gruposDe(rutina) {
  const cuenta = {};
  for (const d of rutina.ejercicios_detalle || []) {
    const g = d.ejercicio?.grupo;
    if (g) cuenta[g] = (cuenta[g] || 0) + 1;
  }
  return Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
}

const NOMBRE_TONO = {
  superior: "Tren superior",
  espalda: "Espalda",
  piernas: "Piernas",
  core: "Core",
  completo: "Cuerpo completo",
};

const tonoDe = (rutina) => TONOS[gruposDe(rutina)[0]] || "completo";
const textoGrupos = (rutina, max = 3) => gruposDe(rutina).slice(0, max).map(grupo).join(" · ");

function resumen(rutina) {
  const ejercicios = rutina.ejercicios_detalle || [];
  return {
    total: ejercicios.length,
    nombres: ejercicios.slice(0, 3).map((d) => d.ejercicio?.nombre).filter(Boolean),
  };
}

// Recomendada primero, luego favoritas, luego las más usadas recientemente
function ordenar(rutinas) {
  return [...rutinas].sort(
    (a, b) =>
      Number(b.recomendada) - Number(a.recomendada) ||
      Number(b.es_favorita) - Number(a.es_favorita) ||
      String(b.ultima_vez || "").localeCompare(String(a.ultima_vez || ""))
  );
}

// ── Pequeños controles ──
function Contador({ valor, onCambio, min = 0, max = 99, paso = 1, formato = (v) => v, etiqueta }) {
  return (
    <div className="rt-contador" aria-label={etiqueta}>
      <button type="button" onClick={() => onCambio(Math.max(min, valor - paso))} disabled={valor <= min} aria-label={`Menos ${etiqueta}`}>
        −
      </button>
      <span>{formato(valor)}</span>
      <button type="button" onClick={() => onCambio(Math.min(max, valor + paso))} disabled={valor >= max} aria-label={`Más ${etiqueta}`}>
        +
      </button>
    </div>
  );
}


function FilaConfig({ datos, onCambio }) {
  const [menuAbierto, setMenuAbierto] = useState(null);

  const cantidad = Math.max(1, Number(datos.series) || 3);

  const configuracion = crearConfiguracionSeries(
    cantidad,
    Number(datos.repeticiones) || 10,
    datos.configuracion_series || []
  );

  const cambiarSerie = (indice, cambios) => {
    const nuevas = configuracion.map((serie, i) =>
      i === indice ? { ...serie, ...cambios } : serie
    );

    onCambio({
      configuracion_series: nuevas,
      series: nuevas.length,
    });
  };

  const cambiarCantidad = (nuevaCantidad) => {
    const nuevas = crearConfiguracionSeries(
      nuevaCantidad,
      Number(datos.repeticiones) || 10,
      configuracion
    );

    onCambio({
      series: nuevaCantidad,
      configuracion_series: nuevas,
    });

    setMenuAbierto(null);
  };

  const cambiarRepeticionesBase = (valor) => {
    onCambio({
      repeticiones: valor,
      configuracion_series: configuracion.map((serie) => ({
        ...serie,
        repeticiones: valor,
      })),
    });
  };

  const etiquetas = {
    normal: (indice) => String(indice + 1),
    calentamiento: () => "W",
    fallo: () => "F",
    drop: () => "D",
  };

  return (
    <div className="rt-ficha-config">
      <div className="rt-config">
        <label>
          <span>Número de series</span>
          <Contador
            etiqueta="series"
            valor={cantidad}
            min={1}
            max={10}
            onCambio={cambiarCantidad}
          />
        </label>

        <label>
          <span>Reps base</span>
          <Contador
            etiqueta="repeticiones"
            valor={Number(datos.repeticiones) || 10}
            min={1}
            max={50}
            onCambio={cambiarRepeticionesBase}
          />
        </label>

        <label>
          <span>Descanso</span>
          <Contador
            etiqueta="descanso"
            valor={Number(datos.descanso_segundos) || 0}
            min={0}
            max={300}
            paso={15}
            formato={formatoDescanso}
            onCambio={(valor) =>
              onCambio({ descanso_segundos: valor })
            }
          />
        </label>
      </div>

      <div className="rt-ficha-unidad">
        <span>Unidad de peso</span>
        <div>
          {["kg", "lb"].map((unidad) => (
            <button
              key={unidad}
              type="button"
              className={datos.unidad_peso === unidad ? "activo" : ""}
              onClick={() => onCambio({ unidad_peso: unidad })}
            >
              {unidad}
            </button>
          ))}
        </div>
      </div>

      <div className="rt-series-planificadas">
        <strong>Plan por serie</strong>

        {configuracion.map((serie, indice) => (
          <div className="rt-serie-plan" key={indice}>
            <div className="rt-serie-tipo">
              <button
                type="button"
                className={`rt-serie-numero tipo-${serie.tipo || "normal"}`}
                aria-label={`Cambiar tipo de la serie ${indice + 1}`}
                aria-expanded={menuAbierto === indice}
                onClick={() =>
                  setMenuAbierto((actual) =>
                    actual === indice ? null : indice
                  )
                }
              >
                {etiquetas[serie.tipo]?.(indice) ?? String(indice + 1)}
              </button>

              {menuAbierto === indice && (
                <div className="rt-serie-menu">
                  {TIPOS_SERIE.map((tipo) => (
                    <button
                      key={tipo.valor}
                      type="button"
                      className={serie.tipo === tipo.valor ? "activo" : ""}
                      onClick={() => {
                        cambiarSerie(indice, { tipo: tipo.valor });
                        setMenuAbierto(null);
                      }}
                    >
                      <span
                        className={`rt-serie-menu-etiqueta tipo-${tipo.valor}`}
                      >
                        {etiquetas[tipo.valor]?.(indice) ?? indice + 1}
                      </span>
                      {tipo.texto}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label>
              <span>Peso ({datos.unidad_peso || "kg"})</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={serie.peso}
                placeholder="0"
                onChange={(e) =>
                  cambiarSerie(indice, {
                    peso:
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                  })
                }
              />
            </label>

            <label>
              <span>Reps</span>
              <input
                type="number"
                min="1"
                max="100"
                value={serie.repeticiones}
                onChange={(e) =>
                  cambiarSerie(indice, {
                    repeticiones:
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>

      <label className="rt-notas">
        <span>Notas del ejercicio</span>
        <textarea
          rows={2}
          maxLength={1000}
          placeholder="Ej. Controlar la bajada y mantener la técnica..."
          value={datos.notas || ""}
          onChange={(e) => onCambio({ notas: e.target.value })}
        />
      </label>
    </div>
  );
}


// Buscador de ejercicios de la biblioteca
function Buscador({ catalogo, excluir = [], onElegir }) {
  const [texto, setTexto] = useState("");
  const q = texto.trim().toLowerCase();
  const resultados = useMemo(
    () =>
      catalogo
        .filter((e) => !excluir.includes(e.id))
        .filter((e) => !q || `${e.nombre} ${grupo(e.grupo)}`.toLowerCase().includes(q))
        .slice(0, 40),
    [catalogo, excluir, q]
  );

  return (
    <div className="rt-buscador">
      <input
        type="search"
        placeholder="Buscar ejercicio (ej. sentadilla, pecho…)"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Buscar ejercicio"
      />
      <ul>
        {resultados.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onElegir(e)}>
              <span>
                <strong>{e.nombre}</strong>
                <small>{grupo(e.grupo)}</small>
              </span>
              <span className="rt-mas" aria-hidden="true">+</span>
            </button>
          </li>
        ))}
        {resultados.length === 0 && <li className="rt-vacio">No hay ejercicios con “{texto}”.</li>}
      </ul>
    </div>
  );
}

function Panel({ titulo, onCerrar, children, pie }) {
  useEffect(() => {
    const cerrar = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [onCerrar]);

  return (
    <div className="rt-fondo" onClick={onCerrar}>
      <section className="rt-panel" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="rt-panel-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="rt-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="rt-panel-cuerpo">{children}</div>
        {pie && <footer className="rt-panel-pie">{pie}</footer>}
      </section>
    </div>
  );
}

// ── Detalle de una rutina: ver, editar y empezar ──
function DetalleRutina({ rutina, usuarioId, catalogo, navigate, onActualizar, onEliminar, onCerrar, onEmpezar }) {
  const [agregando, setAgregando] = useState(false);
  const base = `/usuarios/${usuarioId}/rutinas/${rutina.id}`;
  const detalles = rutina.ejercicios_detalle || [];

  const cambiarEjercicio = (detalle, cambios) => {
    const nuevos = detalles.map((d) => (d.id === detalle.id ? { ...d, ...cambios } : d));
    onActualizar({ ...rutina, ejercicios_detalle: nuevos }); // se ve al instante
    api.patch(`${base}/ejercicios/${detalle.id}/`, cambios).catch(() => onActualizar(rutina));
  };

  const quitar = async (detalle) => {
    await api.delete(`${base}/ejercicios/${detalle.id}/`);
    onActualizar({ ...rutina, ejercicios_detalle: detalles.filter((d) => d.id !== detalle.id) });
  };

const agregar = async (ejercicio) => {
  try {
    const res = await api.post(`${base}/ejercicios/`, {
      ejercicio_id: ejercicio.id,
      ...POR_DEFECTO,
      configuracion_series: crearConfiguracionSeries(3, 10),
      orden: detalles.length,
    });

    onActualizar({
      ...rutina,
      ejercicios_detalle: [
        ...detalles,
        { ...res.data, ejercicio },
      ],
    });

    setAgregando(false);
  } catch (error) {
    console.error("Error al agregar ejercicio:", error);
    // No cerrar el selector si falla la petición.
  }
};
  const alternarFavorita = async () => {
    const res = await api.patch(`${base}/favorita/`, {});
    onActualizar({ ...rutina, es_favorita: res.data.es_favorita });
  };

  return (
    <Panel
      titulo={rutina.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" className="rt-btn" onClick={alternarFavorita}>
            {rutina.es_favorita ? "★ Favorita" : "☆ Favorita"}
          </button>
          <button type="button" className="rt-btn peligro" onClick={() => onEliminar(rutina)}>Eliminar</button>
          <button type="button" className="rt-btn primario rt-btn-empezar" onClick={() => onEmpezar(rutina)} disabled={!detalles.length}>
            ▶ Empezar
          </button>
        </>
      }
    >
      {rutina.descripcion && <p className="rt-descripcion">{rutina.descripcion}</p>}
      <p className="rt-meta">
        {detalles.length} {detalles.length === 1 ? "ejercicio" : "ejercicios"}
        {rutina.veces ? ` · Última vez ${tiempoRelativo(rutina.ultima_vez)}` : " · Aún no la has hecho"}
      </p>

      <ol className="rt-ejercicios">
        {detalles.map((detalle, i) => (
          <li key={detalle.id}>
            <div className="rt-ejercicio-cabecera">
              <span className="rt-orden">{i + 1}</span>
              <span>
                <strong>{detalle.ejercicio?.nombre}</strong>
                <small>{grupo(detalle.ejercicio?.grupo)}</small>
              </span>
              <button type="button" className="rt-quitar" onClick={() => quitar(detalle)} aria-label={`Quitar ${detalle.ejercicio?.nombre}`}>
                Quitar
              </button>
            </div>
            <FilaConfig datos={detalle} onCambio={(cambios) => cambiarEjercicio(detalle, cambios)} />
          </li>
        ))}
      </ol>

      {detalles.length === 0 && !agregando && <p className="rt-vacio">Esta rutina no tiene ejercicios todavía.</p>}


<button
  type="button"
  className="rt-btn rt-btn-ancho"
  onClick={() => {
    sessionStorage.setItem(
      "bodyRhythmRutinaAbierta",
      String(rutina.id)
    );

    navigate("/ejercicios", {
      state: {
        desdeDetalleRutina: true,
        rutinaId: rutina.id,
      },
    });
  }}
>
  + Añadir ejercicio
</button>

    </Panel>
  );
}

// ── Crear una rutina nueva ──
function CrearRutina({
  usuarioId,
  catalogo,
  navigate,
  onCreada,
  onCerrar,
  ejercicioPendiente,
  setEjercicioPendiente,
  modoEntrenamiento = false,
}) {
  const [estado, setEstado] = useState({ guardando: false, error: "" });

  const claveBorrador = modoEntrenamiento
    ? "bodyRhythmBorradorEntrenamiento"
    : "bodyRhythmBorradorRutina";

  const [nombre, setNombre] = useState(() => {
    try {
      const borrador = sessionStorage.getItem(claveBorrador);
      return borrador ? JSON.parse(borrador).nombre || "" : "";
    } catch {
      return "";
    }
  });

  const [elegidos, setElegidos] = useState(() => {
    try {
      const borrador = sessionStorage.getItem(claveBorrador);
      return borrador ? JSON.parse(borrador).elegidos || [] : [];
    } catch {
      return [];
    }
  });


useEffect(() => {
  if (!ejercicioPendiente) return;

  setElegidos((actuales) => {
    const yaExiste = actuales.some(
      (item) =>
        String(item.ejercicio?.id) === String(ejercicioPendiente.id)
    );

    if (yaExiste) return actuales;

    return [
      ...actuales,
      {
        ejercicio: ejercicioPendiente,
        series: 3,
        repeticiones: 10,
        descanso_segundos: 180,
        configuracion_series: crearConfiguracionSeries(3, 10),
      },
    ];
  });

  setEjercicioPendiente(null);
}, [ejercicioPendiente, setEjercicioPendiente]);

  const valido = nombre.trim() && elegidos.length > 0;


  const empezarEntrenamientoTemporal = () => {
    if (!elegidos.length) return;

    sessionStorage.removeItem(claveBorrador);

    onCerrar();

    navigate("/rutinas/entrenamiento", {
      state: {
        nombre: "Entrenamiento vacío",
        ejerciciosTemporales: elegidos.map((item) => ({
          ejercicio: item.ejercicio,
          series: item.series,
          repeticiones: item.repeticiones,
          descanso_segundos: item.descanso_segundos,
          configuracion_series: item.configuracion_series,
        })),
      },
    });
  };


  const guardar = async () => {
    setEstado({ guardando: true, error: "" });
    try {
      const { data: rutina } = await api.post(`/usuarios/${usuarioId}/rutinas/`, { nombre: nombre.trim(), descripcion: "" });
      for (let i = 0; i < elegidos.length; i += 1) {
        const { ejercicio, ...config } = elegidos[i];
        await api.post(`/usuarios/${usuarioId}/rutinas/${rutina.id}/ejercicios/`, { ejercicio_id: ejercicio.id, ...config, orden: i });
      }
      sessionStorage.removeItem("bodyRhythmBorradorRutina");
      onCreada(rutina.id);
    } catch {
      setEstado({ guardando: false, error: "No se pudo guardar la rutina. Intenta de nuevo." });
    }
  };

  const mover = (indice, direccion) => {
    const copia = [...elegidos];
    const destino = indice + direccion;
    if (destino < 0 || destino >= copia.length) return;
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setElegidos(copia);
  };

  return (
    <Panel
      titulo="Nueva rutina"
      onCerrar={onCerrar}

      pie={
        <>
          {estado.error && <p className="rt-error">{estado.error}</p>}
          <button type="button" className="rt-btn" onClick={onCerrar}>
            Cancelar
          </button>

          {modoEntrenamiento ? (
            <button
              type="button"
              className="rt-btn primario"
              onClick={empezarEntrenamientoTemporal}
              disabled={elegidos.length === 0}
            >
              Empezar entrenamiento
            </button>
          ) : (
            <button
              type="button"
              className="rt-btn primario"
              onClick={guardar}
              disabled={!valido || estado.guardando}
            >
              {estado.guardando ? "Guardando…" : "Guardar rutina"}
            </button>
          )}
        </>
      }

    >
      <label className="rt-campo">
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Pierna y glúteo"
          maxLength={100}
          autoFocus
        />
      </label>

      {elegidos.length > 0 && (
        <>
          <h3 className="rt-subtitulo">Ejercicios ({elegidos.length})</h3>
          <ol className="rt-ejercicios">
            {elegidos.map((item, i) => (
              <li key={item.ejercicio.id}>
                <div className="rt-ejercicio-cabecera">
                  <span className="rt-orden">{i + 1}</span>
                  <span>
                    <strong>{item.ejercicio.nombre}</strong>
                    <small>{grupo(item.ejercicio.grupo)}</small>
                  </span>
                  <span className="rt-mover">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === elegidos.length - 1} aria-label="Bajar">↓</button>
                  </span>
                  <button type="button" className="rt-quitar" onClick={() => setElegidos(elegidos.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                </div>
                <FilaConfig
                  datos={item}
                  onCambio={(cambios) => setElegidos(elegidos.map((x, j) => (j === i ? { ...x, ...cambios } : x)))}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      <button
        type="button"
        className="rt-btn rt-btn-ancho"
        onClick={() => {
        sessionStorage.setItem(
          claveBorrador,
          JSON.stringify({ nombre, elegidos })
        );


          navigate("/ejercicios", {
            state: modoEntrenamiento
              ? { desdeEntrenamientoVacio: true }
              : { desdeCrearRutina: true },
          });

        }}
      >
        + Agregar ejercicio
      </button>
    </Panel>
  );
}

const IconoPlay = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

function textoUso(rutina, total) {
  const partes = [`${total} ${total === 1 ? "ejercicio" : "ejercicios"}`];
  if (rutina.veces) partes.push(`última vez ${tiempoRelativo(rutina.ultima_vez)}`);
  return partes.join(" · ");
}

// La rutina recomendada, grande y con un solo botón principal
function Destacada({ rutina, onAbrir, onEmpezar }) {
  const total = (rutina.ejercicios_detalle || []).length;
  const nombres = (rutina.ejercicios_detalle || []).slice(0, 4).map((d) => d.ejercicio?.nombre).filter(Boolean);
  return (
    <section className="rt-destacada" aria-label="Recomendada para ti">
      <div className="rt-destacada-texto">
        <span className="rt-sobretitulo">Recomendada para ti</span>
        <h2>{rutina.nombre}</h2>
        {rutina.descripcion && <p>{rutina.descripcion}</p>}
        <span className="rt-destacada-meta">{textoUso(rutina, total)}</span>
        <div className="rt-destacada-acciones">
          <button type="button" className="rt-btn primario rt-btn-grande" onClick={() => onEmpezar(rutina)} disabled={!total}>
            <IconoPlay /> Empezar
          </button>
          <button type="button" className="rt-btn" onClick={() => onAbrir(rutina)}>
            Ver ejercicios
          </button>
        </div>
      </div>
      <button type="button" className="rt-destacada-lista" onClick={() => onAbrir(rutina)} aria-label="Ver ejercicios">
        <span className="rt-destacada-lista-titulo">Incluye</span>
        <ol>
          {nombres.map((n, i) => (
            <li key={n + i}>
              <span>{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
        {total > nombres.length && <span className="rt-destacada-mas">y {total - nombres.length} más</span>}
      </button>
    </section>
  );
}

function TarjetaRutina({ rutina, onAbrir, onEmpezar }) {
  const { total } = resumen(rutina);
  return (
    <li className="rt-tarjeta">
      <button type="button" className="rt-tarjeta-info" onClick={() => onAbrir(rutina)}>
        <span className={`rt-tono tono-${tonoDe(rutina)}`} aria-hidden="true">{total}</span>
        <span className="rt-tarjeta-textos">
          <strong>
            {rutina.nombre}
            {rutina.es_favorita && <span className="rt-estrella" aria-label="Favorita"> ★</span>}
          </strong>
          <span>{[textoGrupos(rutina, 2), textoUso(rutina, total)].filter(Boolean).join(" · ")}</span>
        </span>
      </button>
      <button
        type="button"
        className="rt-play"
        onClick={() => onEmpezar(rutina)}
        disabled={!total}
        aria-label={`Empezar ${rutina.nombre}`}
        title="Empezar"
      >
        <IconoPlay />
      </button>
    </li>
  );
}

const DIA_MS = 86400000;
const LETRAS = ["L", "M", "M", "J", "V", "S", "D"];

const inicioDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Días de esta semana (lunes a domingo) con entrenamiento, y la racha de días seguidos
function calcularSemana(registros) {
  const hoy = inicioDelDia(Date.now());
  const dias = new Set(registros.map((r) => inicioDelDia(r.fecha)));
  const lunes = hoy - ((new Date(hoy).getDay() + 6) % 7) * DIA_MS;

  let racha = 0;
  let cursor = dias.has(hoy) ? hoy : hoy - DIA_MS;
  while (dias.has(cursor)) {
    racha += 1;
    cursor -= DIA_MS;
  }

  const semana = LETRAS.map((letra, i) => {
    const dia = lunes + i * DIA_MS;
    return { letra, dia, hecho: dias.has(dia), hoy: dia === hoy, futuro: dia > hoy };
  });
  return { semana, total: semana.filter((d) => d.hecho).length, racha };
}

function TuSemana({ datos }) {
  const { semana, total, racha } = datos;
  return (
    <section className="rt-semana" aria-label="Tu semana">
      <div className="rt-semana-texto">
        <span className="rt-sobretitulo">Tu semana</span>
        <strong>
          {total} {total === 1 ? "entrenamiento" : "entrenamientos"}
        </strong>
        <span>{racha ? `Racha de ${racha} ${racha === 1 ? "día" : "días"}` : "Empieza hoy tu racha"}</span>
      </div>
      <ol className="rt-dias">
        {semana.map((d) => (
          <li
            key={d.dia}
            className={[d.hecho && "hecho", d.hoy && "hoy", d.futuro && "futuro"].filter(Boolean).join(" ")}
            aria-label={`${d.letra}: ${d.hecho ? "entrenaste" : "sin entrenamiento"}`}
          >
            <span className="rt-dia-punto" />
            <span className="rt-dia-letra">{d.letra}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RutinasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuarioId, setUsuarioId] = useState(null);
  const [rutinas, setRutinas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [estado, setEstado] = useState({ cargando: true, error: "" });
  const [abiertaId, setAbiertaId] = useState(null);
  const [creando, setCreando] = useState(false);
  const [modoEntrenamiento, setModoEntrenamiento] = useState(false);
  const [ejercicioPendiente, setEjercicioPendiente] = useState(null);

  const [semana, setSemana] = useState(null);
  const [filtro, setFiltro] = useState("todas");

  const cargarRutinas = async (id) => {
    const res = await api.get(`/usuarios/${id}/rutinas/`);
    setRutinas(ordenar(res.data));
  };

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data: yo } = await api.get("/usuarios/me/");
        // Crea las rutinas base la primera vez (no duplica si ya existen)
        await api.post("/rutinas/generar-catalogo/").catch(() => {});
        const [rutinasRes, ejerciciosRes] = await Promise.all([
          api.get(`/usuarios/${yo.id}/rutinas/`),
          api.get("/ejercicios/"),
        ]);
        if (!activo) return;
        setUsuarioId(yo.id);
        setRutinas(ordenar(rutinasRes.data));
        setCatalogo(ejerciciosRes.data);
        setEstado({ cargando: false, error: "" });
      } catch {
        if (activo) setEstado({ cargando: false, error: "No se pudieron cargar tus rutinas." });
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    api
      .get("/entrenamientos/registros/")
      .then((res) => activo && setSemana(calcularSemana(res.data)))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);


useEffect(() => {
  const ejercicio = location.state?.ejercicioSeleccionado;

  if (!ejercicio) return;

  const agregarARutinaExistente = async () => {
    const rutinaId = location.state?.rutinaId;

    if (location.state?.desdeDetalleRutina && rutinaId) {
      try {
        await api.post(
          `/usuarios/${usuarioId}/rutinas/${rutinaId}/ejercicios/`,
          {
            ejercicio_id: ejercicio.id,
            ...POR_DEFECTO,
            configuracion_series: crearConfiguracionSeries(3, 10),
            orden: 999,
          }
        );

        Swal.fire("¡Agregado!", "El ejercicio se añadió a tu rutina.", "success");
        setAbiertaId(rutinaId);
        await cargarRutinas(usuarioId);
      } catch (error) {
        console.error("Error al agregar ejercicio:", error);
        Swal.fire("Error", "No se pudo agregar el ejercicio a la rutina.", "error");
      }
      } else {
        setEjercicioPendiente(ejercicio);

        if (location.state?.desdeEntrenamientoVacio) {
          setModoEntrenamiento(true);
          setCreando(true);
        } else if (location.state?.desdeCrearRutina) {
          setModoEntrenamiento(false);
          setCreando(true);
        }
      }

    navigate("/rutinas", { replace: true, state: null });
  };

  if (usuarioId) {
    agregarARutinaExistente();
  }
}, [location.state, navigate, usuarioId]);


  const abierta = rutinas.find((r) => r.id === abiertaId) || null;

  // Destacada: la recomendada para tu meta; el resto se separa en tuyas y plantillas
  const destacada = rutinas.find((r) => r.recomendada) || null;
  const propias = rutinas.filter((r) => !r.es_plantilla && r !== destacada);
  const plantillas = rutinas.filter((r) => r.es_plantilla && r !== destacada);

  // Filtros por músculo: solo los que tienen al menos una plantilla
  const tonosDisponibles = useMemo(
    () => Object.keys(NOMBRE_TONO).filter((t) => plantillas.some((r) => tonoDe(r) === t)),
    [plantillas]
  );
  const filtroActivo = tonosDisponibles.includes(filtro) ? filtro : "todas";
  const plantillasVisibles = filtroActivo === "todas" ? plantillas : plantillas.filter((r) => tonoDe(r) === filtroActivo);

  const actualizar = (rutina) => setRutinas((lista) => lista.map((r) => (r.id === rutina.id ? rutina : r)));

  const empezar = (rutina) => navigate("/rutinas/entrenamiento", { state: { rutina } });

  const eliminar = async (rutina) => {
    const { isConfirmed } = await Swal.fire({
      ...SWAL,
      title: `¿Eliminar "${rutina.nombre}"?`,
      text: "Tus entrenamientos ya registrados con ella se conservan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    await api.delete(`/usuarios/${usuarioId}/rutinas/${rutina.id}/`);
    setAbiertaId(null);
    setRutinas((lista) => lista.filter((r) => r.id !== rutina.id));
  };

  const creada = async (id) => {
    await cargarRutinas(usuarioId);
    setCreando(false);
    setAbiertaId(id);
  };

  return (
    <>
      <Navbar />
      <main className="rt-page">
        <div className="rt-contenedor">
          <header className="rt-cabecera">
            <div>
              <h1>Rutinas</h1>
              <p>Elige una rutina y empieza, o crea la tuya.</p>
            </div>
            <div className="rt-acciones">
              <button
                type="button"
                className="rt-btn"
                onClick={() => {
                  sessionStorage.removeItem("bodyRhythmBorradorEntrenamiento");
                  setEjercicioPendiente(null);
                  setModoEntrenamiento(true);
                  setCreando(true);
                }}
              >
                Entrenamiento vacío
              </button>

              <button
                type="button"
                className="rt-btn primario"
                onClick={() => {
                  setModoEntrenamiento(false);
                  setCreando(true);
                }}
                disabled={!usuarioId}
              >
                + Nueva rutina
              </button>
            </div>

          </header>

          {estado.cargando && <p className="rt-vacio">Cargando…</p>}
          {estado.error && <p className="rt-error">{estado.error}</p>}

          {semana && <TuSemana datos={semana} />}

          {destacada && <Destacada rutina={destacada} onAbrir={(r) => setAbiertaId(r.id)} onEmpezar={empezar} />}

          {!estado.cargando && (
            <section className="rt-seccion">
              <h2 className="rt-seccion-titulo">Mis rutinas</h2>
              {propias.length ? (
                <ul className="rt-grid">
                  {propias.map((r) => (
                    <TarjetaRutina key={r.id} rutina={r} onAbrir={(x) => setAbiertaId(x.id)} onEmpezar={empezar} />
                  ))}
                </ul>
              ) : (
                <button type="button" className="rt-vacio-crear" onClick={() => setCreando(true)} disabled={!usuarioId}>
                  <span className="rt-vacio-icono">+</span>
                  <span>
                    <strong>Crea tu primera rutina</strong>
                    <small>Elige tus ejercicios o guárdala desde el asistente de IA.</small>
                  </span>
                </button>
              )}
            </section>
          )}

          {plantillas.length > 0 && (
            <section className="rt-seccion">
              <h2 className="rt-seccion-titulo">Plantillas</h2>
              {tonosDisponibles.length > 1 && (
                <div className="rt-filtros" role="group" aria-label="Filtrar por músculo">
                  {["todas", ...tonosDisponibles].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={filtroActivo === t ? "activo" : ""}
                      aria-pressed={filtroActivo === t}
                      onClick={() => setFiltro(t)}
                    >
                      {t !== "todas" && <span className={`rt-filtro-punto tono-${t}`} aria-hidden="true" />}
                      {t === "todas" ? "Todas" : NOMBRE_TONO[t]}
                    </button>
                  ))}
                </div>
              )}
              <ul className="rt-grid">
                {plantillasVisibles.map((r) => (
                  <TarjetaRutina key={r.id} rutina={r} onAbrir={(x) => setAbiertaId(x.id)} onEmpezar={empezar} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      {abierta && (
        <DetalleRutina
          rutina={abierta}
          usuarioId={usuarioId}
          catalogo={catalogo}
          onActualizar={actualizar}
          onEliminar={eliminar}
          onEmpezar={empezar}
          navigate={navigate}
          onCerrar={() => setAbiertaId(null)}
        />
      )}



{creando && (
  <CrearRutina
    usuarioId={usuarioId}
    catalogo={catalogo}
    navigate={navigate}
    onCreada={creada}
    onCerrar={() => setCreando(false)}
    ejercicioPendiente={ejercicioPendiente}
    setEjercicioPendiente={setEjercicioPendiente}
    modoEntrenamiento={modoEntrenamiento}
  />
)}


  </>
  );
}
