import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { animacionDe } from "../utils/ejercicios";

const nombresGrupos = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Core",
  cuadriceps: "Cuádriceps",
  femoral: "Femoral",
  gluteos: "Glúteos",
  pantorrillas: "Pantorrillas",
  cardio: "Cardio",
  cuerpo_completo: "Cuerpo completo",
  // Grupos de la biblioteca (vienen de RepDB en inglés)
  chest: "Pecho",
  back: "Espalda",
  upper_legs: "Piernas",
  lower_legs: "Pantorrillas",
  shoulders: "Hombros",
  upper_arms: "Brazos",
  lower_arms: "Antebrazos",
  core: "Core",
  full_body: "Cuerpo completo",
};

const clasesGrupos = {
  pecho: "pecho",
  espalda: "espalda",
  hombros: "hombros",
  biceps: "brazos",
  triceps: "brazos",
  abdomen: "core",
  cuadriceps: "piernas",
  femoral: "piernas",
  gluteos: "piernas",
  pantorrillas: "pantorrillas",
  cardio: "cardio",
  cuerpo_completo: "cuerpo-completo",
  chest: "pecho",
  back: "espalda",
  upper_legs: "piernas",
  lower_legs: "pantorrillas",
  shoulders: "hombros",
  upper_arms: "brazos",
  lower_arms: "brazos",
  core: "core",
  full_body: "cuerpo-completo",
};

function ExerciseCard({ ejercicio }) {
  const navigate = useNavigate();
  const video = useRef(null);
  const animacion = animacionDe(ejercicio);

  // En la tarjeta solo se ve el póster; el video corre al pasar el mouse
  const reproducir = () => {
    video.current?.play().catch(() => {});
  };
  const detener = () => {
    if (!video.current) return;
    video.current.pause();
    video.current.currentTime = 0;
  };

const grupoNombre =
  nombresGrupos[ejercicio.grupo] || ejercicio.grupo;

const grupoClase =
  clasesGrupos[ejercicio.grupo] || "default";

  const abrirDetalle = () => {
    navigate(`/ejercicios/${ejercicio.id}`);
  };

  return (
    <article
      className="card"
      onClick={abrirDetalle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          abrirDetalle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${ejercicio.nombre}`}
      onMouseEnter={animacion ? reproducir : undefined}
      onMouseLeave={animacion ? detener : undefined}
    >
      <div className={`card-image-wrapper${animacion ? " card-image-wrapper--animada" : ""}`}>

        {animacion ? (
          <>
            <video
              ref={video}
              className="card-img card-video"
              src={animacion.video}
              poster={animacion.poster}
              muted
              loop
              playsInline
              preload="none"
              aria-label={ejercicio.nombre}
            />
            <div className="card-image-gradient" />
          </>
        ) : ejercicio.imagen_inicio ? (
          <>
            <img
              src={ejercicio.imagen_inicio}
              alt={ejercicio.nombre}
              className="card-img card-img-start"
              loading="lazy"
            />

            {ejercicio.imagen_final && (
              <img
                src={ejercicio.imagen_final}
                alt=""
                className="card-img card-img-final"
                loading="lazy"
              />
            )}

            <div className="card-image-gradient" />
          </>
        ) : (
          <div className="card-image-placeholder">
            <span>🏋️</span>
            <p>Imagen no disponible</p>
          </div>
        )}

        <span
          className={`grupo-badge grupo-badge--${grupoClase}`}
        >
          {grupoNombre}
        </span>

        <div className="card-view">
          <span>Ver ejercicio</span>
          <span>↗</span>
        </div>
      </div>

      <div className="card-content">

        <div className="card-heading">
          <h3>{ejercicio.nombre}</h3>

        </div>

        <p className="card-description">
          {ejercicio.descripcion ||
            "Consulta los detalles de este ejercicio."}
        </p>

      </div>
    </article>
  );
}

export default ExerciseCard;