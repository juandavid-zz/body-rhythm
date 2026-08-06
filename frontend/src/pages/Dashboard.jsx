import { useNavigate } from 'react-router-dom'
import '../css/dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/auth')
  }

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <a href="/" className="logo">
          Body <span>Rhythm</span>
        </a>
        <button className="btn-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      <div className="dashboard-wrap">
        <h1>Bienvenido a Body Rhythm</h1>
        <p>Tu panel principal. Aquí iremos agregando tus estadísticas y progreso.</p>

        <div className="section-label">Secciones</div>
        <div className="section-grid">

          {/* ── ENTRENAMIENTOS ── */}
          <div className="section-card activa">
            <div className="icono">💪</div>
            <h3>Entrenamientos</h3>
            <p>
              Generá una rutina personalizada con IA según tu IMC y tu meta,
              adaptada al lugar y equipo que tengas disponible.
            </p>
            <button className="btn-primary" onClick={() => navigate('/chatbot')}>
              Generar mi rutina con IA
            </button>
          </div>

          {/* ── NUTRICIÓN (próximamente) ── */}
          <div className="section-card proximamente">
            <span className="badge-proximamente">Próximamente</span>
            <div className="icono">🥗</div>
            <h3>Nutrición</h3>
            <p>Planes de comidas y seguimiento de tu registro nutricional.</p>
          </div>

          {/* ── PROGRESO (próximamente) ── */}
          <div className="section-card proximamente">
            <span className="badge-proximamente">Próximamente</span>
            <div className="icono">📈</div>
            <h3>Progreso</h3>
            <p>Historial de IMC y medidas corporales a lo largo del tiempo.</p>
          </div>

        </div>
      </div>
    </div>
  )
}