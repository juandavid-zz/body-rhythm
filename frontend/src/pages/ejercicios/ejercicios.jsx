import { useEffect, useRef, useState } from "react";
import ExerciseCard from "../../components/exerciseCard";
import Navbar from "../../components/Navbar";
import "../../css/ejercicios.css";
import { obtenerEjercicios } from "../../utils/ejercicios";

const grupos = {
  Todos: null,
  Pecho: "chest",
  Espalda: "back",
  Piernas: "upper_legs",
  Hombros: "shoulders",
  Brazos: "upper_arms",
  Core: "core",
  "Cuerpo completo": "full_body",
};

// Brazos y Piernas juntan dos grupos de la base de datos
const gruposDe = {
  Brazos: ["upper_arms", "lower_arms"],
  Piernas: ["upper_legs", "lower_legs"],
};

const perteneceA = (ejercicio, nombreGrupo) =>
  (gruposDe[nombreGrupo] || [grupos[nombreGrupo]]).includes(ejercicio.grupo);

// Los más conocidos van primero en cada fila
const ESENCIALES = [
  "bench-press", "db-bench-press", "incline-bench-press", "incline-db-press", "push-up", "db-fly", "dips",
  "pull-up", "lat-pulldown", "barbell-row", "bent-over-db-row", "deadlift", "seated-cable-row", "chin-ups",
  "squat", "front-squat", "leg-press", "romanian-deadlift", "hip-thrust", "lunge", "bulgarian-split-squat", "leg-curl",
  "ohp", "dumbbell-shoulder-press", "lateral-raise", "arnold-press", "face-pull", "rear-delt-fly",
  "barbell-curl", "hammer-curl", "bicep-curl", "tricep-pushdown", "skull-crusher", "concentration-curl",
  "plank", "crunches", "hanging-leg-raise", "russian-twist", "ab-wheel-rollout", "side-plank",
  "burpees", "kettlebell-swing", "thruster", "clean", "jumping-jacks", "mountain-climbers",
];
const prioridad = (ejercicio) => {
  const i = ESENCIALES.indexOf(ejercicio.repdb_id);
  return i === -1 ? ESENCIALES.length : i;
};

const POR_FILA = 12;

// Una fila que se desliza de lado, al estilo de Apple Fitness
function FilaGrupo({ titulo, lista, onVerTodos }) {
  const carril = useRef(null);

  const mover = (direccion) => {
    const el = carril.current;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section className="fila-grupo" aria-labelledby={`fila-${titulo}`}>
      <div className="fila-grupo-cabecera">
        <div>
          <h2 id={`fila-${titulo}`}>{titulo}</h2>
          <span>{lista.length} ejercicios</span>
        </div>

        <div className="fila-grupo-acciones">
          <button type="button" className="fila-flecha" onClick={() => mover(-1)} aria-label={`Anteriores de ${titulo}`}>
            ‹
          </button>
          <button type="button" className="fila-flecha" onClick={() => mover(1)} aria-label={`Siguientes de ${titulo}`}>
            ›
          </button>
          <button type="button" className="fila-ver-todos" onClick={onVerTodos}>
            Ver todos
          </button>
        </div>
      </div>

      <div className="fila-grupo-carril" ref={carril}>
        {lista.slice(0, POR_FILA).map((ejercicio) => (
          <ExerciseCard key={ejercicio.id} ejercicio={ejercicio} />
        ))}
      </div>
    </section>
  );
}

function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarEjercicios = async () => {
      try {
        setCargando(true);
        setError("");

        setEjercicios(await obtenerEjercicios());
      } catch (error) {
        console.error("Error al cargar ejercicios:", error);
        setError("No se pudieron cargar los ejercicios.");
      } finally {
        setCargando(false);
      }
    };

    cargarEjercicios();
  }, []);
  
const ejerciciosFiltrados = ejercicios.filter((ejercicio) => {
  const normalizarTexto = (texto = "") =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const textoBusqueda = normalizarTexto(busqueda);

  const coincideBusqueda =
    !textoBusqueda ||
    normalizarTexto(ejercicio.nombre).includes(textoBusqueda) ||
    normalizarTexto(ejercicio.descripcion).includes(textoBusqueda);

  const coincideGrupo =
    filtroGrupo === "Todos" || perteneceA(ejercicio, filtroGrupo);

  return coincideBusqueda && coincideGrupo;
});

  // Sin búsqueda ni filtro se ve por filas; si no, la cuadrícula con los resultados
  const verPorFilas = filtroGrupo === "Todos" && !busqueda.trim();

  const filas = Object.keys(grupos)
    .filter((nombre) => nombre !== "Todos")
    .map((nombre) => ({
      nombre,
      lista: ejercicios
        .filter((ejercicio) => perteneceA(ejercicio, nombre))
        .sort((a, b) => prioridad(a) - prioridad(b)),
    }))
    .filter((fila) => fila.lista.length > 0);

  const verGrupo = (nombre) => {
    setFiltroGrupo(nombre);
    document.querySelector(".filtros-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Navbar />

      <main className="ejercicios-container">

        {/* HEADER */}
        <div className="ejercicios-header">
          <div className="ejercicios-header-content">
            <span className="ejercicios-overline">
              BIBLIOTECA DE ENTRENAMIENTO
            </span>

            <h1>
              Encuentra tu próximo <span>ejercicio.</span>
            </h1>

            <p>
              Explora nuestra biblioteca y encuentra ejercicios
              para cada grupo muscular y objetivo.
            </p>
          </div>

          <div className="ejercicios-header-count">
            <strong>{ejercicios.length}</strong>
            <span>ejercicios</span>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="ejercicios-search">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Buscar por nombre o ejercicio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {busqueda && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div className="filtros-header">
          <h2 className="filtros-title">
            Grupo muscular
          </h2>

          <span>
            {ejerciciosFiltrados.length} ejercicios
          </span>
        </div>

        <div className="filtros">
          {Object.keys(grupos).map((grupo) => (
            <button
              key={grupo}
              type="button"
              className={`filtro-btn ${
                filtroGrupo === grupo
                  ? "filtro-activo"
                  : ""
              }`}
              onClick={() => setFiltroGrupo(grupo)}
            >
              {grupo}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {cargando && (
          <div className="ejercicios-loading">
            <div className="ejercicios-spinner"></div>
            <p>Cargando ejercicios...</p>
          </div>
        )}

        {/* ERROR */}
        {error && !cargando && (
          <div className="ejercicios-error">
            <span>!</span>

            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* RESULTADOS */}
        {!cargando && !error && verPorFilas && (
          <div className="filas-grupos">
            {filas.map((fila) => (
              <FilaGrupo
                key={fila.nombre}
                titulo={fila.nombre}
                lista={fila.lista}
                onVerTodos={() => verGrupo(fila.nombre)}
              />
            ))}
          </div>
        )}

        {!cargando && !error && !verPorFilas && (
          <>
            {ejerciciosFiltrados.length > 0 ? (
              <div className="lista-ejercicios">
                {ejerciciosFiltrados.map((ejercicio) => (
                  <ExerciseCard
                    key={ejercicio.id}
                    ejercicio={ejercicio}
                  />
                ))}
              </div>
            ) : (
              <div className="ejercicios-vacio">
                <span>⌕</span>

                <h3>
                  No encontramos ejercicios
                </h3>

                <p>
                  Intenta buscar otro nombre o
                  seleccionar otro grupo muscular.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroGrupo("Todos");
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Ejercicios;