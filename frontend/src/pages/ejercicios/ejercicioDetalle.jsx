import { useNavigate, useParams } from "react-router-dom";
import { ejercicios } from "../../data/ejercicios";
import "../../css/ejercicios.css";

export default function EjercicioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const ejercicio = ejercicios.find(
    (e) => e.id === Number(id)
  );

  if (!ejercicio) {
    return <h2>Ejercicio no encontrado</h2>;
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

        <img
          src={ejercicio.imagen}
          alt={ejercicio.nombre}
          className="ejercicio-gif"
        />

        <p className="descripcion">
          <strong>Descripción:</strong> {ejercicio.descripcion}
        </p>
      </div>
    </div>
  );
}
