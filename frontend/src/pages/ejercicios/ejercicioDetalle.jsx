import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/ejercicios.css";

export default function EjercicioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ejercicio, setEjercicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ejercicios/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar los ejercicios");
        }

        return response.json();
      })
      .then((data) => {
        const ejercicioEncontrado = data.find(
          (ejercicio) => ejercicio.id === Number(id)
        );

        if (!ejercicioEncontrado) {
          setError("Ejercicio no encontrado");
          return;
        }

        setEjercicio(ejercicioEncontrado);
      })
      .catch((error) => {
        console.error("Error al cargar el ejercicio:", error);
        setError("No se pudo cargar el ejercicio.");
      })
      .finally(() => {
        setCargando(false);
      });
  }, [id]);

  if (cargando) {
    return (
      <div className="detalle-container">
        <h2>Cargando ejercicio...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detalle-container">
        <h2>{error}</h2>

        <button onClick={() => navigate("/ejercicios")}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="detalle-container">
      <button onClick={() => navigate("/ejercicios")}>
        ← Volver
      </button>

      <div className="detalle-card">
        <h1>{ejercicio.nombre}</h1>

        <p className="grupo-badge">
          {ejercicio.grupo}
        </p>

        {ejercicio.imagen && (
          <img
            src={ejercicio.imagen}
            alt={ejercicio.nombre}
            className="ejercicio-gif"
          />
        )}

        {ejercicio.descripcion && (
          <p className="descripcion">
            <strong>Descripción:</strong>{" "}
            {ejercicio.descripcion}
          </p>
        )}

        {ejercicio.musculos_principales?.length > 0 && (
          <section className="detalle-seccion">
            <h2>Músculos principales</h2>

            <ul>
              {ejercicio.musculos_principales.map((musculo) => (
                <li key={musculo}>
                  {musculo}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.musculos_secundarios?.length > 0 && (
          <section className="detalle-seccion">
            <h2>Músculos secundarios</h2>

            <ul>
              {ejercicio.musculos_secundarios.map((musculo) => (
                <li key={musculo}>
                  {musculo}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.equipamiento?.length > 0 && (
          <section className="detalle-seccion">
            <h2>Equipamiento</h2>

            <ul>
              {ejercicio.equipamiento.map((equipo) => (
                <li key={equipo}>
                  {equipo}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.videos?.length > 0 && (
          <section className="detalle-seccion">
            <h2>Videos</h2>

            <ul>
              {ejercicio.videos.map((video) => (
                <li key={video}>
                  {video}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}