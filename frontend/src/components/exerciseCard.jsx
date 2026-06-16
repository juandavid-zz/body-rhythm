import { useNavigate } from "react-router-dom";

function ExerciseCard({ ejercicio }) {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      onClick={() => navigate(`/ejercicios/${ejercicio.id}`)}
    >
      <img
        src={ejercicio.imagen}
        alt={ejercicio.nombre}
        className="card-img"
      />

      <h3>{ejercicio.nombre}</h3>

<p className={`grupo-badge grupo-badge--${ejercicio.grupo.toLowerCase()}`}>
  {ejercicio.grupo}
</p>
    </div>
  );
}

export default ExerciseCard;