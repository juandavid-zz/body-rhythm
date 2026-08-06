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
  { mes: 'Ene', peso: 72 },
  { mes: 'Feb', peso: 74 },
  { mes: 'Mar', peso: 75 },
  { mes: 'Abr', peso: 76 },
  { mes: 'May', peso: 77 },
  { mes: 'Jun', peso: 78 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-date">{label}</p>
        <p className="chart-tooltip-value">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

function Progreso() {
  const progreso = 72;

  return (
    <div className="progreso-page">

      {/* ── Título ── */}
      <div className="progreso-header">
        <h1 className="progreso-title">Mi Progreso</h1>
        <p className="progreso-subtitle">Seguimiento de tu evolución física</p>
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <div className="stats-grid">
        <div className="stat-card stat-card--peso">
          <span className="stat-icon">⚖️</span>
          <div className="stat-value">
            78 <span className="stat-unit">kg</span>
          </div>
          <p className="stat-label">Peso Actual</p>
          <span className="stat-trend stat-trend--up">↑ +6 kg</span>
        </div>

        <div className="stat-card stat-card--meta">
          <span className="stat-icon">🎯</span>
          <div className="stat-value">
            85 <span className="stat-unit">kg</span>
          </div>
          <p className="stat-label">Meta</p>
        </div>

        <div className="stat-card stat-card--entrenos">
          <span className="stat-icon">🏋️</span>
          <div className="stat-value">42</div>
          <p className="stat-label">Entrenamientos</p>
        </div>

        <div className="stat-card stat-card--racha">
          <span className="stat-icon">🔥</span>
          <div className="stat-value">
            7 <span className="stat-unit">días</span>
          </div>
          <p className="stat-label">Racha</p>
        </div>
      </div>

      {/* ── Avance hacia la meta ── */}
      <div className="progress-section">
        <div className="section-header">
          <h2 className="section-title">Avance hacia la meta</h2>
          <span className="section-badge">{progreso}% completado</span>
        </div>

        <div className="progress-info">
          <span className="progress-label">Peso actual vs meta</span>
          <span className="progress-percentage">{progreso}%</span>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="progress-range">
          <span>0 kg</span>
          <span>85 kg (meta)</span>
        </div>
      </div>

      {/* ── Resumen de actividad ── */}
      <div className="activity-section">
        <div className="section-header">
          <h2 className="section-title">Resumen de actividad</h2>
        </div>

        <ul className="activity-list">
          <li className="activity-item">
            <div className="activity-icon-wrap">🏋️</div>
            <div className="activity-info">
              <p className="activity-name">Entrenamientos realizados</p>
              <p className="activity-meta">Desde enero 2025</p>
            </div>
            <span className="activity-value">42</span>
          </li>

          <li className="activity-item">
            <div className="activity-icon-wrap activity-icon-wrap--purple">💪</div>
            <div className="activity-info">
              <p className="activity-name">Ejercicios completados</p>
              <p className="activity-meta">Series totales</p>
            </div>
            <span className="activity-value">120</span>
          </li>

          <li className="activity-item">
            <div className="activity-icon-wrap activity-icon-wrap--blue">⏱️</div>
            <div className="activity-info">
              <p className="activity-name">Horas entrenadas</p>
              <p className="activity-meta">Tiempo activo</p>
            </div>
            <span className="activity-value">38 h</span>
          </li>

          <li className="activity-item">
            <div className="activity-icon-wrap activity-icon-wrap--orange">🔥</div>
            <div className="activity-info">
              <p className="activity-name">Calorías quemadas</p>
              <p className="activity-meta">Estimado total</p>
            </div>
            <span className="activity-value">15.400</span>
          </li>
        </ul>
      </div>

      {/* ── Gráfica de evolución física ── */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title-row">
            <h2 className="section-title">Evolución Física</h2>
            <div className="chart-period-tabs">
              <button className="chart-period-tab active">6M</button>
              <button className="chart-period-tab">1A</button>
              <button className="chart-period-tab">Todo</button>
            </div>
          </div>

          <div className="chart-quick-stats">
            <div>
              <span className="chart-quick-stat-value positive">+6 kg</span>
              <span className="chart-quick-stat-label">Ganancia total</span>
            </div>
            <div>
              <span className="chart-quick-stat-value">+1 kg</span>
              <span className="chart-quick-stat-label">Último mes</span>
            </div>
            <div>
              <span className="chart-quick-stat-value">72 kg</span>
              <span className="chart-quick-stat-label">Inicio</span>
            </div>
          </div>
        </div>

        <div className="chart-body">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={datosPeso}
              margin={{ top: 10, right: 16, left: -10, bottom: 4 }}
            >
              <XAxis
                dataKey="mes"
                tick={{ fill: '#4A5068', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#4A5068', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{ fill: '#151820', stroke: '#00E5A0', strokeWidth: 2, r: 4 }}
                activeDot={{ fill: '#00E5A0', stroke: '#151820', strokeWidth: 2, r: 6 }}
              />
              {/* Gradiente para la línea */}
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#7B61FF" />
                  <stop offset="100%" stopColor="#00E5A0" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

export default Progreso;