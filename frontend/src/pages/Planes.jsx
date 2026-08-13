import React from "react";
import Navbar from "../components/Navbar";
import "../css/planes.css";

const planes = [
  {
    nombre: "Free",
    precio: "0",
    descripcion: "Todo lo esencial para comenzar tu entrenamiento.",
    clase: "free",
    beneficios: [
      "Rutinas básicas",
      "Seguimiento de progreso",
      "Lista de ejercicios",
      "Perfil personalizado",
    ],
    boton: "Plan actual",
  },
  {
    nombre: "Pro",
    precio: "19.900",
    descripcion:
      "Más herramientas para llevar tu entrenamiento al siguiente nivel.",
    clase: "pro",
    destacado: true,
    beneficios: [
      "Todo lo incluido en Free",
      "Rutinas personalizadas",
      "Estadísticas avanzadas",
      "Seguimiento detallado",
      "Recomendaciones inteligentes",
    ],
    boton: "Elegir Pro",
  },
  {
    nombre: "Premium",
    precio: "29.900",
    descripcion: "La experiencia completa de Body Rhythm.",
    clase: "premium",
    beneficios: [
      "Todo lo incluido en Pro",
      "Entrenamientos ilimitados",
      "Planes personalizados",
      "Asistente de IA",
      "Funciones exclusivas",
      "Soporte prioritario",
    ],
    boton: "Elegir Premium",
  },
];

function Planes() {
  return (
    <div className="planes-page">
      <Navbar />

      <main className="planes-container">

        {/* HERO */}
        <section className="planes-hero">
          <span className="planes-badge">BODY RHYTHM</span>

          <h1>
            Elige el plan que se adapte a <span>tu ritmo</span>
          </h1>

          <p>
            Mejora tu entrenamiento, sigue tu progreso y alcanza tus objetivos
            con las herramientas de Body Rhythm.
          </p>
        </section>

        {/* PLANES */}
        <section className="planes-grid">
          {planes.map((plan) => (
            <article
              key={plan.nombre}
              className={
                "plan-card " +
                plan.clase +
                (plan.destacado ? " destacado" : "")
              }
            >

              {/* MÁS POPULAR */}
              {plan.destacado && (
                <div className="plan-popular">
                  MÁS POPULAR
                </div>
              )}

              {/* INFORMACIÓN */}
              <div className="plan-header">
                <h2>{plan.nombre}</h2>

                <p className="plan-description">
                  {plan.descripcion}
                </p>

                <div className="plan-price">
                  <span>$</span>
                  {plan.precio}
                  <small>COP / mes</small>
                </div>
              </div>

              <div className="plan-divider"></div>

              {/* BENEFICIOS */}
              <ul className="plan-benefits">
                {plan.beneficios.map((beneficio, index) => (
                  <li key={index}>
                    <span className="check">✓</span>
                    {beneficio}
                  </li>
                ))}
              </ul>

              {/* BOTÓN */}
              <button
                className={"plan-button " + plan.clase}
                disabled={plan.nombre === "Free"}
              >
                {plan.boton}
              </button>

            </article>
          ))}
        </section>

        {/* PARTE FINAL */}
        <section className="planes-bottom">
          <h3>Entrena. Progresa. Supera tus límites.</h3>

          <p>
            Elige el plan que mejor se adapte a tus objetivos y comienza a
            construir una mejor versión de ti.
          </p>
        </section>

      </main>
    </div>
  );
}

export default Planes;