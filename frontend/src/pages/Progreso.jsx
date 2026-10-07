
import { useState } from "react";
import Navbar from "../components/Navbar";
import "../css/Progreso.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const datosPeso = [
  { mes: "Ene", peso: 50 },
  { mes: "Feb", peso: 52 },
  { mes: "Mar", peso: 55 },
  { mes: "Abr", peso: 58 },
  { mes: "May", peso: 60 },
  { mes: "Jun", peso: 63 },
  { mes: "Jul", peso: 65 },
  { mes: "Ago", peso: 68 },
  { mes: "Sep", peso: 70 },
  { mes: "Oct", peso: 73 },
  { mes: "Nov", peso: 76 },
  { mes: "Dic", peso: 78 },
];

const resumenSemanal = [
  { dia: "Lun", entrenado: true },
  { dia: "Mar", entrenado: true },
  { dia: "Mié", entrenado: false },
  { dia: "Jue", entrenado: true },
  { dia: "Vie", entrenado: true },
  { dia: "Sáb", entrenado: false },
  { dia: "Dom", entrenado: true },
];

const logros = [
  {
    icono: "🔥",
    titulo: "Racha de 7 días",
    descripcion: "Entrenaste durante una semana seguida",
  },
  {
    icono: "💪",
    titulo: "Primer entrenamiento",
    descripcion: "Completaste tu primera rutina",
  },
  {
    icono: "🏆",
    titulo: "50 ejercicios",
    descripcion: "Superaste 50 ejercicios realizados",
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{payload[0].value} kg</strong>
    </div>
  );
};

function Progreso() {
  const [activeMetric, setActiveMetric] = useState("peso");

  const progreso = 72;

  // Datos temporales del usuario.
  // Más adelante estos valores pueden venir directamente del perfil/API.
  const pesoActual = 78;
  const altura = 1.8;

  // Cálculo del IMC
  const imc = pesoActual / (altura * altura);
  const imcRedondeado = imc.toFixed(1);

  let categoriaIMC = "";
  let descripcionIMC = "";
  let posicionIMC = 0;

  if (imc < 18.5) {
    categoriaIMC = "Bajo peso";
    descripcionIMC =
      "Tu IMC se encuentra por debajo del rango de referencia general.";
    posicionIMC = 15;
  } else if (imc < 25) {
    categoriaIMC = "Rango saludable";
    descripcionIMC =
      "Tu IMC se encuentra dentro del rango de referencia considerado saludable para adultos.";
    posicionIMC = 40;
  } else if (imc < 30) {
    categoriaIMC = "Sobrepeso";
    descripcionIMC =
      "Tu IMC se encuentra por encima del rango de referencia general.";
    posicionIMC = 62;
  } else {
    categoriaIMC = "Obesidad";
    descripcionIMC =
      "Tu IMC se encuentra por encima del rango de referencia general.";
    posicionIMC = 85;
  }

  return (
    <>
      <Navbar />

      <main className="progreso-page">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="progreso-header">
          <div>
            <span className="eyebrow">
              TU EVOLUCIÓN
            </span>

            <h1 className="progreso-title">
              Mi Progreso
            </h1>

            <p className="progreso-subtitle">
              Aquí puedes ver tu evolución y los resultados de tu esfuerzo.
            </p>
          </div>
        </header>


        {/* =====================================================
            ESTADÍSTICAS PRINCIPALES
        ===================================================== */}

        <section className="stats-grid">

          <article className="stat-card stat-card--purple">

            <div className="stat-top">
              <span className="stat-icon">⚖</span>
              <span className="stat-trend">↗ +28 kg</span>
            </div>

            <div className="stat-value">
              78
              <span>kg</span>
            </div>

            <p className="stat-label">
              Peso actual
            </p>

            <small>
              desde el inicio
            </small>

          </article>


          <article className="stat-card stat-card--blue">

            <div className="stat-top">
              <span className="stat-icon">◎</span>
              <span className="stat-mini">OBJETIVO</span>
            </div>

            <div className="stat-value">
              85
              <span>kg</span>
            </div>

            <p className="stat-label">
              Meta
            </p>

            <small>
              Faltan 7 kg
            </small>

          </article>


          <article className="stat-card stat-card--green">

            <div className="stat-top">
              <span className="stat-icon">♜</span>
              <span className="stat-trend">↗ Esta semana</span>
            </div>

            <div className="stat-value">
              5
            </div>

            <p className="stat-label">
              Días entrenados
            </p>

            <small>
              entrenamientos
            </small>

          </article>


          <article className="stat-card stat-card--orange">

            <div className="stat-top">
              <span className="stat-icon">🔥</span>
              <span className="stat-mini">ACTIVA</span>
            </div>

            <div className="stat-value">
              7
            </div>

            <p className="stat-label">
              Racha actual
            </p>

            <small>
              días seguidos
            </small>

          </article>

        </section>


        {/* =====================================================
            GRÁFICA + PROGRESO
        ===================================================== */}

        <section className="main-progress-grid">

          {/* =================================================
              EVOLUCIÓN
          ================================================= */}

          <article className="chart-section">

            <div className="chart-header">

              <div>
                <div className="section-heading-row">

                  <span className="section-icon">
                    ⌁
                  </span>

                  <div>
                    <h2>
                      Evolución física
                    </h2>

                    <p>
                      Consulta tu peso o una referencia de tu IMC
                    </p>
                  </div>

                </div>
              </div>


              {/* BOTONES PESO / IMC */}

              <div className="chart-tabs">

                <button
                  type="button"
                  className={activeMetric === "peso" ? "active" : ""}
                  onClick={() => setActiveMetric("peso")}
                >
                  Peso
                </button>

                <button
                  type="button"
                  className={activeMetric === "imc" ? "active" : ""}
                  onClick={() => setActiveMetric("imc")}
                >
                  IMC
                </button>

              </div>

            </div>


            {/* =================================================
                VISTA PESO
            ================================================= */}

            {activeMetric === "peso" && (

              <div className="chart-container">

                <LineChart
                  width={1000}
                  height={360}
                  data={datosPeso}
                  margin={{
                    top: 25,
                    right: 25,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    horizontal={true}
                    vertical={false}
                    stroke="rgba(255,255,255,0.06)"
                  />

                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#777b87",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={[45, 85]}
                    tick={{
                      fill: "#777b87",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "rgba(139,92,246,0.2)",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#8b5cf6",
                      stroke: "#111319",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: "#a78bfa",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />

                </LineChart>

              </div>

            )}


            {/* =================================================
                VISTA IMC
            ================================================= */}

            {activeMetric === "imc" && (

              <div className="imc-panel">

                {/* PARTE PRINCIPAL */}

                <div className="imc-main">

                  <div className="imc-score">

                    <span className="imc-label">
                      Tu IMC actual
                    </span>

                    <strong>
                      {imcRedondeado}
                    </strong>

                    <span className="imc-category">
                      {categoriaIMC}
                    </span>

                  </div>


                  <div className="imc-description">

                    <h3>
                      ¿Dónde estás?
                    </h3>

                    <p>
                      {descripcionIMC}
                    </p>


                    {/* BARRA IMC */}

                    <div className="imc-range">

                      <div className="imc-range-bar">

                        <span
                          className="imc-marker"
                          style={{
                            left: `${posicionIMC}%`,
                          }}
                        ></span>

                      </div>


                      <div className="imc-range-labels">
                        <span>&lt; 18.5</span>
                        <span>18.5</span>
                        <span>25</span>
                        <span>30</span>
                        <span>40+</span>
                      </div>

                    </div>

                  </div>

                </div>


                {/* DATOS UTILIZADOS */}

                <div className="imc-data">

                  <div>
                    <span>Peso utilizado</span>
                    <strong>
                      {pesoActual} kg
                    </strong>
                  </div>

                  <div>
                    <span>Altura registrada</span>
                    <strong>
                      {altura.toFixed(2)} m
                    </strong>
                  </div>

                  <div>
                    <span>Fórmula</span>
                    <strong>
                      kg / m²
                    </strong>
                  </div>

                </div>


                {/* INFORMACIÓN IMPORTANTE */}

                <div className="imc-notice">

                  <span className="imc-notice-icon">
                    i
                  </span>

                  <div>

                    <strong>
                      El IMC es una referencia, no una medida perfecta
                    </strong>

                    <p>
                      El IMC puede ayudarte a tener una referencia general
                      sobre tu relación entre peso y altura, pero no explica
                      por completo tu composición corporal. No diferencia
                      entre músculo, grasa, masa ósea, agua u otros factores.
                      Por eso, especialmente si entrenas fuerza, tu IMC debe
                      interpretarse junto con otras medidas y tu contexto
                      personal.
                    </p>

                  </div>

                </div>

              </div>

            )}

          </article>


          {/* =================================================
              PROGRESO HACIA LA META
          ================================================= */}

          <article className="goal-progress-card">

            <div className="goal-card-header">

              <div>

                <span className="section-icon">
                  ◎
                </span>

                <div>

                  <h2>
                    Avance hacia la meta
                  </h2>

                  <p>
                    Peso actual vs meta
                  </p>

                </div>

              </div>

            </div>


            <div
              className="progress-circle"
              style={{
                "--progress": `${progreso * 3.6}deg`,
              }}
            >

              <div className="progress-circle-inner">

                <strong>
                  {progreso}%
                </strong>

                <span>
                  completado
                </span>

              </div>

            </div>


            <div className="goal-legend">

              <div>

                <span className="legend-dot purple"></span>

                <p>
                  Actual
                  <strong>
                    78 kg
                  </strong>
                </p>

                <b>
                  72%
                </b>

              </div>


              <div>

                <span className="legend-dot gray"></span>

                <p>
                  Faltante
                  <strong>
                    7 kg
                  </strong>
                </p>

                <b>
                  28%
                </b>

              </div>

            </div>

          </article>

        </section>


        {/* =====================================================
            FILA SECUNDARIA
        ===================================================== */}

        <section className="secondary-grid">

          {/* RESUMEN SEMANAL */}

          <article className="dashboard-card weekly-card-large">

            <div className="card-heading">

              <div>

                <h2>
                  Resumen semanal
                </h2>

                <p>
                  Tus entrenamientos de la semana
                </p>

              </div>

              <span className="card-heading-icon">
                ▣
              </span>

            </div>


            <div className="week-days">

              {resumenSemanal.map((item) => (

                <div
                  key={item.dia}
                  className={`week-day ${
                    item.entrenado ? "active" : ""
                  }`}
                >

                  <span className="week-day-name">
                    {item.dia}
                  </span>

                  <span className="week-day-circle">
                    {item.entrenado ? "✓" : "×"}
                  </span>

                </div>

              ))}

            </div>

          </article>


          {/* ACTIVIDAD */}

          <article className="dashboard-card activity-card">

            <div className="card-heading">

              <div>

                <h2>
                  Actividad reciente
                </h2>

                <p>
                  Tu actividad acumulada
                </p>

              </div>

              <span className="card-heading-icon">
                ⚡
              </span>

            </div>


            <div className="activity-rows">

              <div className="activity-row">
                <span>◷</span>
                <p>Horas entrenadas</p>
                <strong>27 h</strong>
              </div>

              <div className="activity-row">
                <span>♜</span>
                <p>Entrenamientos realizados</p>
                <strong>42</strong>
              </div>

              <div className="activity-row">
                <span>☷</span>
                <p>Ejercicios completados</p>
                <strong>120</strong>
              </div>

              <div className="activity-row">
                <span>♨</span>
                <p>Calorías quemadas</p>
                <strong>15.400</strong>
              </div>

            </div>

          </article>


          {/* FRASE */}

          <article className="motivation-card">

            <div className="motivation-overlay"></div>

            <div className="motivation-content">

              <span className="quote-mark">
                “
              </span>

              <h2>
                El progreso
                <br />
                no siempre se ve,
                <br />
                <strong>
                  pero se siente.
                </strong>
              </h2>

              <div className="quote-line"></div>

            </div>

          </article>

        </section>


        {/* =====================================================
            ANTES VS AHORA
        ===================================================== */}

        <section className="bottom-grid">

          {/* ANTES VS AHORA */}

          <article className="dashboard-card compare-card">

            <div className="card-heading">

              <div>

                <h2>
                  Antes vs Ahora
                </h2>

                <p>
                  Tu transformación en números
                </p>

              </div>

              <span className="card-heading-icon">
                ↗
              </span>

            </div>


            <div className="compare-content">

              <div>

                <span>
                  Antes
                </span>

                <strong>
                  50 kg
                </strong>

              </div>


              <div className="compare-divider"></div>


              <div>

                <span>
                  Ahora
                </span>

                <strong>
                  78 kg
                </strong>

              </div>


              <div className="compare-divider"></div>


              <div>

                <span>
                  Cambio
                </span>

                <strong className="positive">
                  +28 kg
                </strong>

              </div>

            </div>

          </article>


          {/* METAS */}

          <article className="dashboard-card smart-goal-card">

            <div className="card-heading">

              <div>

                <h2>
                  Metas inteligentes
                </h2>

                <p>
                  Tu siguiente objetivo
                </p>

              </div>

              <span className="card-heading-icon">
                ◎
              </span>

            </div>


            <div className="smart-goal-content">

              <div className="goal-icon">
                🎯
              </div>


              <div className="goal-text">

                <h3>
                  Llegar a 85 kg
                </h3>

                <p>
                  Faltan 7 kg para alcanzar tu objetivo
                </p>


                <div className="goal-bar">

                  <span
                    style={{
                      width: `${progreso}%`,
                    }}
                  ></span>

                </div>


                <div className="goal-bar-footer">

                  <span>
                    Progreso
                  </span>

                  <strong>
                    {progreso}%
                  </strong>

                </div>

              </div>

            </div>

          </article>


          {/* LOGROS */}

          <article className="dashboard-card achievements-card">

            <div className="card-heading">

              <div>

                <h2>
                  Logros desbloqueados
                </h2>

                <p>
                  Todo lo que has conseguido
                </p>

              </div>

              <button
                type="button"
                className="view-all"
              >
                Ver todos →
              </button>

            </div>


            <div className="achievements-list">

              {logros.map((logro) => (

                <div
                  className="achievement"
                  key={logro.titulo}
                >

                  <div className="achievement-icon">
                    {logro.icono}
                  </div>

                  <h3>
                    {logro.titulo}
                  </h3>

                  <p>
                    {logro.descripcion}
                  </p>

                </div>

              ))}

            </div>

          </article>

        </section>

      </main>
    </>
  );
}

export default Progreso;


