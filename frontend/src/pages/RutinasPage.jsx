import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/api";
import Navbar from "../components/Navbar";
import { tiempoRelativo } from "../utils/formato";
import "../css/rutinas.css";

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
const POR_DEFECTO = { series: 3, repeticiones: 10, descanso_segundos: 60 };

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
  return (
    <div className="rt-config">
      <label>
        <span>Series</span>
        <Contador etiqueta="series" valor={datos.series} min={1} max={10} onCambio={(v) => onCambio({ series: v })} />
      </label>
      <label>
        <span>Reps</span>
        <Contador etiqueta="repeticiones" valor={datos.repeticiones} min={1} max={50} onCambio={(v) => onCambio({ repeticiones: v })} />
      </label>
      <label>
        <span>Descanso</span>
        <Contador
          etiqueta="descanso"
          valor={datos.descanso_segundos}
          min={0}
          max={300}
          paso={15}
          formato={formatoDescanso}
          onCambio={(v) => onCambio({ descanso_segundos: v })}
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
function DetalleRutina({ rutina, usuarioId, catalogo, onActualizar, onEliminar, onCerrar, onEmpezar }) {
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
    const res = await api.post(`${base}/ejercicios/`, { ejercicio_id: ejercicio.id, ...POR_DEFECTO, orden: detalles.length });
    onActualizar({ ...rutina, ejercicios_detalle: [...detalles, { ...res.data, ejercicio }] });
    setAgregando(false);
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

      {agregando ? (
        <div className="rt-agregar">
          <Buscador catalogo={catalogo} excluir={detalles.map((d) => d.ejercicio?.id)} onElegir={agregar} />
          <button type="button" className="rt-link" onClick={() => setAgregando(false)}>Cancelar</button>
        </div>
      ) : (
        <button type="button" className="rt-btn rt-btn-ancho" onClick={() => setAgregando(true)}>+ Añadir ejercicio</button>
      )}
    </Panel>
  );
}

// ── Crear una rutina nueva ──
function CrearRutina({ usuarioId, catalogo, onCreada, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [elegidos, setElegidos] = useState([]); // { ejercicio, series, repeticiones, descanso_segundos }
  const [estado, setEstado] = useState({ guardando: false, error: "" });

  const valido = nombre.trim() && elegidos.length > 0;

  const guardar = async () => {
    setEstado({ guardando: true, error: "" });
    try {
      const { data: rutina } = await api.post(`/usuarios/${usuarioId}/rutinas/`, { nombre: nombre.trim(), descripcion: "" });
      for (let i = 0; i < elegidos.length; i += 1) {
        const { ejercicio, ...config } = elegidos[i];
        await api.post(`/usuarios/${usuarioId}/rutinas/${rutina.id}/ejercicios/`, { ejercicio_id: ejercicio.id, ...config, orden: i });
      }
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
          <button type="button" className="rt-btn" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="rt-btn primario" onClick={guardar} disabled={!valido || estado.guardando}>
            {estado.guardando ? "Guardando…" : "Guardar rutina"}
          </button>
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

      <h3 className="rt-subtitulo">{elegidos.length ? "Añadir más ejercicios" : "Elige los ejercicios"}</h3>
      <Buscador
        catalogo={catalogo}
        excluir={elegidos.map((x) => x.ejercicio.id)}
        onElegir={(ejercicio) => setElegidos([...elegidos, { ejercicio, ...POR_DEFECTO }])}
      />
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
  const [usuarioId, setUsuarioId] = useState(null);
  const [rutinas, setRutinas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [estado, setEstado] = useState({ cargando: true, error: "" });
  const [abiertaId, setAbiertaId] = useState(null);
  const [creando, setCreando] = useState(false);
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
              <button type="button" className="rt-btn" onClick={() => navigate("/rutinas/entrenamiento")}>
                Entrenamiento vacío
              </button>
              <button type="button" className="rt-btn primario" onClick={() => setCreando(true)} disabled={!usuarioId}>
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
          onCerrar={() => setAbiertaId(null)}
        />
      )}

      {creando && <CrearRutina usuarioId={usuarioId} catalogo={catalogo} onCreada={creada} onCerrar={() => setCreando(false)} />}
    </>
  );
}
