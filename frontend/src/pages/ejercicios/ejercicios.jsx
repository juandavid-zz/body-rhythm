import { useState } from "react";
import { ejercicios } from "../../data/ejercicios";
import ExerciseCard from "../../components/ExerciseCard";
import Navbar from "../../components/Navbar";
import "../../css/ejercicios.css";

function Ejercicios() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");

  const ejerciciosFiltrados = ejercicios.filter((ejercicio) => {
    const coincideBusqueda = ejercicio.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideGrupo =
      filtroGrupo === "Todos" ||
      ejercicio.grupo === filtroGrupo;

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
      </div>
    </>
  );
}

export default Ejercicios;