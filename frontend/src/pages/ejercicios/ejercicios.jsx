import { useEffect, useState } from "react";
import ExerciseCard from "../../components/ExerciseCard";
import Navbar from "../../components/Navbar";
import "../../css/ejercicios.css";

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

        const response = await fetch(
          "http://127.0.0.1:8000/api/ejercicios/"
        );

        if (!response.ok) {
          throw new Error("No se pudieron cargar los ejercicios");
        }

        const data = await response.json();
        setEjercicios(data);
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

  const grupoSeleccionado = grupos[filtroGrupo];

  let coincideGrupo = true;

  if (grupoSeleccionado) {
    if (filtroGrupo === "Brazos") {
      coincideGrupo = ["upper_arms", "lower_arms"].includes(
        ejercicio.grupo
      );
    } else if (filtroGrupo === "Piernas") {
      coincideGrupo = ["upper_legs", "lower_legs"].includes(
        ejercicio.grupo
      );
    } else {
      coincideGrupo = ejercicio.grupo === grupoSeleccionado;
    }
  }

  return coincideBusqueda && coincideGrupo;
});

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
        {!cargando && !error && (
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