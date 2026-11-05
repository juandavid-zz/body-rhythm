import { useRef, useState } from "react";

// Video del ejercicio con el estilo de la app, con velocidad normal, lenta y pausa
function AnimacionEjercicio({ animacion, nombre }) {
  const video = useRef(null);
  const [modo, setModo] = useState("normal");

  const cambiar = (nuevo) => {
    const v = video.current;
    if (!v) return;
    if (nuevo === "pausa") {
      v.pause();
    } else {
      v.playbackRate = nuevo === "lento" ? 0.5 : 1;
      v.play().catch(() => {});
    }
    setModo(nuevo);
  };

  return (
    <div className="ej-animacion">
      <video
        ref={video}
        className="ej-animacion-video"
        src={animacion.video}
        poster={animacion.poster}
        autoPlay
        muted
        loop
        playsInline
        aria-label={`Animación de ${nombre}`}
      />
      <div className="ej-animacion-controles" role="group" aria-label="Velocidad de la animación">
        {[
          ["normal", "Normal"],
          ["lento", "Lento"],
          ["pausa", "Pausar"],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            className={modo === valor ? "activo" : ""}
            aria-pressed={modo === valor}
            onClick={() => cambiar(valor)}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AnimacionEjercicio;
