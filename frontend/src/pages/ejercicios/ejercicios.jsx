import { useState } from "react";
import { ejercicios } from "../../data/ejercicios";
import ExerciseCard from "../../components/ExerciseCard";

import "../../css/ejercicios.css";

function Ejercicios() {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const ejerciciosFiltrados = ejercicios.filter((ejercicio) => {
    const coincideBusqueda = ejercicio.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideGrupo =
      filtro === "Todos" || ejercicio.grupo === filtro;

    return coincideBusqueda && coincideGrupo;
  });

  return (
    <>
      <div className="ejercicios-container">
        <h1>Ejercicios</h1>

        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

<div className="filtros">
  <button
    className={`filtro-btn ${
      filtro === "Todos" ? "filtro-activo" : ""
    }`}
    onClick={() => setFiltro("Todos")}
  >
    Todos
  </button>

  <button
    className={`filtro-btn ${
      filtro === "Pecho" ? "filtro-activo" : ""
    }`}
    onClick={() => setFiltro("Pecho")}
  >
    Pecho
  </button>

  <button
    className={`filtro-btn ${
      filtro === "Espalda" ? "filtro-activo" : ""
    }`}
    onClick={() => setFiltro("Espalda")}
  >
    Espalda
  </button>

  <button
    className={`filtro-btn ${
      filtro === "Pierna" ? "filtro-activo" : ""
    }`}
    onClick={() => setFiltro("Pierna")}
  >
    Pierna
  </button>
</div>

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