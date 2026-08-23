import { useEffect, useState } from "react";
import ExerciseCard from "../../components/ExerciseCard";
import Navbar from "../../components/Navbar";
import "../../css/ejercicios.css";

function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const gruposWger = {
  Pecho: "Chest",
  Espalda: "Back",
  Pierna: "Legs",
  Hombro: "Shoulders",
  Brazo: "Arms",
  Core: "Abs",
  Cardio: "Cardio",
};

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ejercicios/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar los ejercicios");
        }

        return response.json();
      })
      .then((data) => {
        setEjercicios(data);
      })
      .catch((error) => {
        console.error("Error al cargar ejercicios:", error);
        setError("No se pudieron cargar los ejercicios.");
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  const ejerciciosFiltrados = ejercicios.filter((ejercicio) => {
    const coincideBusqueda = ejercicio.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

  const coincideGrupo =
    filtroGrupo === "Todos" ||
    ejercicio.grupo === gruposWger[filtroGrupo];

    return coincideBusqueda && coincideGrupo;
  });

  return (
    <>
      <Navbar />

      <div className="ejercicios-container">
        <h1>Biblioteca de ejercicios</h1>

        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <h2>Grupo muscular</h2>

        <div className="filtros">
          {[
            "Todos",
            "Pecho",
            "Espalda",
            "Pierna",
            "Hombro",
            "Brazo",
            "Core",
            "Cardio",
          ].map((grupo) => (
            <button
              key={grupo}
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
          <p className="contador-ejercicios">
            Cargando ejercicios...
          </p>
        )}

        {error && (
          <p className="contador-ejercicios">
            {error}
          </p>
        )}

        {!cargando && !error && (
          <>
            <p className="contador-ejercicios">
              {ejerciciosFiltrados.length}{" "}
              {ejerciciosFiltrados.length === 1
                ? "ejercicio encontrado"
                : "ejercicios encontrados"}
            </p>

            <div className="lista-ejercicios">
              {ejerciciosFiltrados.map((ejercicio) => (
                <ExerciseCard
                  key={ejercicio.id}
                  ejercicio={ejercicio}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Ejercicios;