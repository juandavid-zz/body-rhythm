import { useState } from "react";
import Navbar from "../components/Navbar";
import "../css/index.css";

export default function AdminPage() {
  const [seccion, setSeccion] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [nuevoEjercicio, setNuevoEjercicio] = useState({ nombre: "", descripcion: "", grupo_muscular: "pecho" });
  const [mostrarForm, setMostrarForm] = useState(false);

  const grupos = ["pecho", "espalda", "hombros", "biceps", "triceps", "abdomen", "cuadriceps", "femoral", "gluteos", "pantorrillas", "cardio", "cuerpo_completo"];

  const secciones = [
    { id: "usuarios", icon: "👥", label: "Usuarios" },
    { id: "ejercicios", icon: "🏋️", label: "Ejercicios" },
    { id: "rutinas", icon: "📋", label: "Rutinas" },
  ];

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a0533 100%)", paddingTop: "5rem", color: "#fff", display: "flex" }}>
        
        {/* Sidebar */}
        <div style={{ width: "250px", background: "rgba(255,255,255,0.05)", borderRight: "1px solid rgba(168,85,247,0.2)", padding: "2rem 1rem", flexShrink: 0 }}>
          <h2 style={{ color: "#a855f7", marginBottom: "0.5rem", fontSize: "1.3rem" }}>⚡ Admin Panel</h2>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "2rem" }}>Gestión del sistema</p>
          {secciones.map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)}
              style={{ display: "flex", alignItems: "center", gap: "0.8rem", width: "100%", padding: "0.9rem 1rem", marginBottom: "0.5rem", background: seccion === s.id ? "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))" : "transparent", color: seccion === s.id ? "#a855f7" : "#9ca3af", border: seccion === s.id ? "1px solid rgba(168,85,247,0.4)" : "1px solid transparent", borderRadius: "10px", cursor: "pointer", fontWeight: seccion === s.id ? "600" : "400", fontSize: "0.95rem", textAlign: "left" }}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          
          {seccion === "usuarios" && (
            <div>
              <h2 style={{ color: "#fff", marginBottom: "0.5rem" }}>👥 Usuarios <span style={{ color: "#a855f7" }}>({usuarios.length})</span></h2>
              <p style={{ color: "#6b7280", marginBottom: "2rem" }}>Gestión de usuarios registrados en la plataforma</p>
              {usuarios.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid rgba(168,85,247,0.1)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</div>
                  <p>Inicia sesión para ver los usuarios</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(168,85,247,0.1)" }}>
                      <th style={{ padding: "1rem", textAlign: "left", color: "#a855f7" }}>Nombre</th>
                      <th style={{ padding: "1rem", textAlign: "left", color: "#a855f7" }}>Género</th>
                      <th style={{ padding: "1rem", textAlign: "left", color: "#a855f7" }}>Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(168,85,247,0.1)" }}>
                        <td style={{ padding: "1rem" }}>{u.nombre}</td>
                        <td style={{ padding: "1rem", color: "#9ca3af" }}>{u.genero || "-"}</td>
                        <td style={{ padding: "1rem", color: "#9ca3af" }}>{u.meta || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {seccion === "ejercicios" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h2 style={{ color: "#fff", margin: 0 }}>🏋️ Ejercicios <span style={{ color: "#a855f7" }}>({ejercicios.length})</span></h2>
                <button onClick={() => setMostrarForm(!mostrarForm)}
                  style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", border: "none", padding: "0.7rem 1.3rem", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>
                  + Agregar
                </button>
              </div>
              <p style={{ color: "#6b7280", marginBottom: "2rem" }}>Gestión del catálogo de ejercicios</p>

              {mostrarForm && (
                <div style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
                  <h3 style={{ color: "#a855f7", marginTop: 0 }}>Nuevo ejercicio</h3>
                  <input placeholder="Nombre" value={nuevoEjercicio.nombre}
                    onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, nombre: e.target.value })}
                    style={{ width: "100%", padding: "0.8rem", marginBottom: "0.8rem", borderRadius: "10px", border: "1px solid rgba(168,85,247,0.4)", background: "rgba(0,0,0,0.3)", color: "#fff", boxSizing: "border-box" }} />
                  <input placeholder="Descripción" value={nuevoEjercicio.descripcion}
                    onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, descripcion: e.target.value })}
                    style={{ width: "100%", padding: "0.8rem", marginBottom: "0.8rem", borderRadius: "10px", border: "1px solid rgba(168,85,247,0.4)", background: "rgba(0,0,0,0.3)", color: "#fff", boxSizing: "border-box" }} />
                  <select value={nuevoEjercicio.grupo_muscular}
                    onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, grupo_muscular: e.target.value })}
                    style={{ width: "100%", padding: "0.8rem", marginBottom: "1rem", borderRadius: "10px", border: "1px solid rgba(168,85,247,0.4)", background: "rgba(0,0,0,0.3)", color: "#fff" }}>
                    {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button onClick={() => { if (nuevoEjercicio.nombre) { setEjercicios([...ejercicios, { ...nuevoEjercicio, id: Date.now() }]); setMostrarForm(false); setNuevoEjercicio({ nombre: "", descripcion: "", grupo_muscular: "pecho" }); }}}
                      style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", border: "none", padding: "0.8rem 1.5rem", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>
                      Guardar
                    </button>
                    <button onClick={() => setMostrarForm(false)}
                      style={{ background: "transparent", color: "#9ca3af", border: "1px solid #444", padding: "0.8rem 1.5rem", borderRadius: "10px", cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                {ejercicios.map(e => (
                  <div key={e.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "12px", padding: "1.2rem" }}>
                    <h4 style={{ color: "#a855f7", margin: "0 0 0.5rem" }}>{e.nombre}</h4>
                    <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 0.8rem" }}>{e.descripcion}</p>
                    <span style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem" }}>{e.grupo_muscular}</span>
                    <button onClick={() => setEjercicios(ejercicios.filter(ex => ex.id !== e.id))}
                      style={{ display: "block", marginTop: "0.8rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "0.3rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
                      Eliminar
                    </button>
                  </div>
                ))}
                {ejercicios.length === 0 && !mostrarForm && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "#6b7280", background: "rgba(255,255,255,0.03)", borderRadius: "16px" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏋️</div>
                    <p>No hay ejercicios. Agrega el primero.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {seccion === "rutinas" && (
            <div>
              <h2 style={{ color: "#fff", marginBottom: "0.5rem" }}>📋 Rutinas</h2>
              <p style={{ color: "#6b7280", marginBottom: "2rem" }}>Gestión de rutinas de todos los usuarios</p>
              <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid rgba(168,85,247,0.1)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
                <p>Las rutinas de los usuarios aparecerán aquí</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}