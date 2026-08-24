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
    const textoBusqueda = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      !textoBusqueda ||
      ejercicio.nombre?.toLowerCase().includes(textoBusqueda) ||
      ejercicio.descripcion?.toLowerCase().includes(textoBusqueda);

    const grupoSeleccionado = grupos[filtroGrupo];

    const coincideGrupo =
      !grupoSeleccionado ||
      ejercicio.grupo === grupoSeleccionado;

    return coincideBusqueda && coincideGrupo;
  });

  return (
    <>
      <Navbar />

      <main className="ejercicios-container">

        <div className="ejercicios-header">
          <div>
            <span className="ejercicios-overline">
              BODY RHYTHM
            </span>

            <h1>Ejercicios</h1>

            <p>
              Explora ejercicios y encuentra los que necesites
              para complementar tus entrenamientos.
            </p>
          </div>
        </div>

        <div className="ejercicios-search">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Buscar ejercicio..."
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

        <div className="filtros-header">
          <h2 className="filtros-title">Grupo muscular</h2>

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
                filtroGrupo === grupo ? "filtro-activo" : ""
              }`}
              onClick={() => setFiltroGrupo(grupo)}
            >
              {grupo}
            </button>
          ))}
        </div>

        {cargando && (
          <div className="ejercicios-loading">
            <div className="ejercicios-spinner"></div>
            <p>Cargando ejercicios...</p>
          </div>
        )}

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

        {!cargando && !error && (
          <>
            <p className="contador-ejercicios">
              {ejerciciosFiltrados.length === 1
                ? "1 ejercicio encontrado"
                : `${ejerciciosFiltrados.length} ejercicios encontrados`}
            </p>

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

                <h3>No encontramos ejercicios</h3>

                <p>
                  Intenta buscar otro nombre o seleccionar otro
                  grupo muscular.
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