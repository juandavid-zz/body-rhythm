import '../css/Progreso.css';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';



const datosPeso = [
  { mes: 'Ene', peso: 50 },
  { mes: 'Feb', peso: 52 },
  { mes: 'Mar', peso: 55 },
  { mes: 'Abr', peso: 58 },
  { mes: 'May', peso: 60},
  { mes: 'Jun', peso: 65 },
  { mes: 'Jul', peso: 68 },
  { mes: 'Ago', peso: 70 },
  { mes: 'Sep', peso: 72 },
  { mes: 'Oct', peso: 75 },
  { mes: 'Nov', peso: 78 },
  { mes: 'Dic', peso: 80 }
];


const resumenSemanal = [
  { dia: "Lun", entrenado: true },
  { dia: "Mar", entrenado: true },
  { dia: "Mié", entrenado: false },
  { dia: "Jue", entrenado: true },
  { dia: "Vie", entrenado: true },
  { dia: "Sáb", entrenado: false },
  { dia: "Dom", entrenado: true }
];



const logros = [

  {
    icono: "🔥",
    titulo: "Racha de 7 días",
    descripcion: "Entrenaste durante una semana seguida"
  },

  {
    icono: "💪",
    titulo: "Primer entrenamiento",
    descripcion: "Completaste tu primera rutina"
  },

  {
    icono: "🏆",
    titulo: "50 ejercicios",
    descripcion: "Superaste 50 ejercicios realizados"
  }

];



const CustomTooltip = ({ active, payload, label }) => {


  if (active && payload && payload.length) {

    return (

      <div className="chart-tooltip">

        <p>
          {label}
        </p>

        <strong>
          {payload[0].value} kg
        </strong>

      </div>

    )

  }

  return null;

};

function Progreso() {


  const progreso = 72;



  return (

    <>

      <div className="progreso-page">



        {/* TITULO */}

        <div className="progreso-header">

          <h1 className="progreso-title">
            Mi Progreso
          </h1>


          <p className="progreso-subtitle">
            Seguimiento de tu evolución física
          </p>


        </div>

        {/* ESTADISTICAS */}


        <div className="stats-grid">


          <div className="stat-card stat-card--peso">

            <span className="stat-icon">
              ⚖️
            </span>

            <div className="stat-value">
              78 <span className="stat-unit">kg</span>
            </div>

            <p className="stat-label">
              Peso actual
            </p>


          </div>


          <div className="stat-card stat-card--meta">

            <span className="stat-icon">
              🎯
            </span>

            <div className="stat-value">
              85 <span className="stat-unit">kg</span>
            </div>

            <p className="stat-label">
              Meta
            </p>

          </div>


          <div className="stat-card stat-card--entrenos">

            <span className="stat-icon">
              🏋️
            </span>

            <div className="stat-value">
              5
            </div>

            <p className="stat-label">
              Días entrenados
            </p>

          </div>


          <div className="stat-card stat-card--racha">

            <span className="stat-icon">
              🔥
            </span>

            <div className="stat-value">
              7
            </div>

            <p className="stat-label">
              Racha
            </p>

          </div>



        </div>








        {/* BARRA DE PROGRESO */}


        <div className="progress-section">


          <h2 className="section-title">
            Avance hacia la meta
          </h2>



          <div className="progress-info">

            <span>
              Peso actual vs meta
            </span>

            <strong>
              {progreso}%
            </strong>

          </div>



          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${progreso}%`
              }}
            ></div>


          </div>


        </div>








        {/* RESUMEN SEMANAL */}


        <div className="weekly-section">


          <h2 className="section-title">
            Resumen semanal
          </h2>



          <div className="weekly-grid">


            <div className="weekly-card">

              <span>
                🏋️
              </span>

              <div>

                <h3>
                  5
                </h3>

                <p>
                  Días entrenados
                </p>

              </div>

            </div>





            <div className="weekly-card">

              <span>
                ⏱️
              </span>

              <div>

                <h3>
                  6.5h
                </h3>

                <p>
                  Tiempo activo
                </p>

              </div>

            </div>





            <div className="weekly-card">

              <span>
                🔥
              </span>

              <div>

                <h3>
                  7
                </h3>

                <p>
                  Racha actual
                </p>

              </div>

            </div>


          </div>

        </div>










        {/* CALENDARIO */}



        <div className="calendar-section">


          <h2 className="section-title">
            Calendario de actividad
          </h2>



          <div className="calendar">


            {
              resumenSemanal.map((item, index) => (


                <div
                  key={index}
                  className={
                    item.entrenado
                      ?
                      "day active"
                      :
                      "day"
                  }
                >


                  <span>
                    {item.dia}
                  </span>


                </div>


              ))
            }


          </div>


        </div>









        {/* COMPARACION */}



        <div className="compare-section">


          <h2 className="section-title">
            Antes vs Ahora
          </h2>



          <div className="compare-grid">


            <div>

              <p>
                Antes
              </p>

              <strong>
                50 kg
              </strong>

            </div>



            <div>

              <p>
                Ahora
              </p>

              <strong>
                65 kg
              </strong>

            </div>




            <div>

              <p>
                Cambio
              </p>

              <strong className="positive">
                +15 kg
              </strong>


            </div>


          </div>


        </div>









        {/* METAS */}



        <div className="goals-section">


          <h2 className="section-title">
            Metas inteligentes
          </h2>



          <div className="goal-card">


            <span>
              🎯
            </span>


            <div>

              <h3>
                Llegar a 85 kg
              </h3>


              <p>
                Faltan 7 kg para alcanzar tu objetivo
              </p>


            </div>


          </div>


        </div>









        {/* LOGROS */}



        <div className="achievements-section">


          <h2 className="section-title">
            Logros desbloqueados
          </h2>




          <div className="achievement-grid">


            {
              logros.map((logro, index) => (


                <div
                  className="achievement-card"
                  key={index}
                >


                  <span>
                    {logro.icono}
                  </span>


                  <h3>
                    {logro.titulo}
                  </h3>


                  <p>
                    {logro.descripcion}
                  </p>


                </div>


              ))
            }


          </div>


        </div>









        {/* ACTIVIDAD */}



 {/* ── Actividad reciente ── */}

<div className="activity-section">

<h2 className="section-title">
Actividad reciente
</h2>


<ul className="activity-list">


<li className="activity-item">

<div className="activity-icon-wrap">
⏱️
</div>

<p className="activity-name">
Horas entrenadas
</p>

<span className="activity-value">
27 h
</span>

</li>



<li className="activity-item">

<div className="activity-icon-wrap">
🏋️
</div>

<p className="activity-name">
Entrenamientos realizados
</p>

<span className="activity-value">
42
</span>

</li>



<li className="activity-item">

<div className="activity-icon-wrap">
💪
</div>

<p className="activity-name">
Ejercicios completados
</p>

<span className="activity-value">
120
</span>

</li>



<li className="activity-item">

<div className="activity-icon-wrap">
🔥
</div>

<p className="activity-name">
Calorías quemadas
</p>

<span className="activity-value">
15.400
</span>

</li>


</ul>


</div>

        {/* GRAFICA */}



        <div className="chart-section">


          <h2 className="section-title">
            Evolución Física
          </h2>



          <ResponsiveContainer width="100%" height={300}>


            <LineChart data={datosPeso}>


              <XAxis dataKey="mes" />

              <YAxis />


              <Tooltip
                content={<CustomTooltip />}
              />


              <Line

                type="monotone"

                dataKey="peso"

                stroke="#803aa3"

                strokeWidth={3}

              />


            </LineChart>



          </ResponsiveContainer>



        </div>





      </div>

    </>


  )


}



export default Progreso;