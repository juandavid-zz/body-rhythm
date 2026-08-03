import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000/api";

export default function AdminPage() {
  const [seccion, setSeccion] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [nuevoEjercicio, setNuevoEjercicio] = useState({ nombre: "", descripcion: "", grupo_muscular: "pecho" });
  const [mostrarForm, setMostrarForm] = useState(false);

  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/usuarios/`, { headers }).then(r => r.ok ? r.json() : []).then(setUsuarios).catch(() => setUsuarios([]));
    fetch(`${API}/ejercicios/`, { headers }).then(r => r.ok ? r.json() : []).then(setEjercicios).catch(() => setEjercicios([]));
  }, []);

  const crearEjercicio = () => {
    fetch(`${API}/ejercicios/`, { method: "POST", headers, body: JSON.stringify(nuevoEjercicio) })
      .then(r => r.ok ? r.json() : null)
      .then(e => { if (e) { setEjercicios([...ejercicios, e]); setMostrarForm(false); } });
  };

  const eliminarEjercicio = (id) => {
    fetch(`${API}/ejercicios/${id}/`, { method: "DELETE", headers })
      .then(() => setEjercicios(ejercicios.filter(e => e.id !== id)));
  };

  const grupos = ["pecho", "espalda", "hombros", "biceps", "triceps", "abdomen", "cuadriceps", "femoral", "gluteos", "pantorrillas", "cardio", "cuerpo_completo"];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f0f1a", color: "#fff", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "auto" }}>
      <div style={{ width: "220px", background: "#1a1a2e", padding: "2rem 1rem", borderRight: "1px solid #2d2d4e", flexShrink: 0 }}>
        <h2 style={{ color: "#a855f7", marginBottom: "2rem" }}>Admin Panel</h2>
        {["usuarios", "ejercicios", "rutinas"].map(s => (
          <button key={s} onClick={() => setSeccion(s)}
            style={{ display: "block", width: "100%", padding: "0.8rem", marginBottom: "0.5rem", background: seccion === s ? "#a855f7" : "transparent", color: "#fff", border: "1px solid #a855f7", borderRadius: "8px", cursor: "pointer", textTransform: "capitalize" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {seccion === "usuarios" && (
          <div>
            <h2 style={{ color: "#a855f7", marginBottom: "1.5rem" }}>Usuarios ({usuarios.length})</h2>
            {usuarios.length === 0 && <p style={{ color: "#888" }}>Inicia sesión para ver usuarios.</p>}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a1a2e" }}>
                  <th style={{ padding: "0.8rem", textAlign: "left", color: "#a855f7" }}>Nombre</th>
                  <th style={{ padding: "0.8rem", textAlign: "left", color: "#a855f7" }}>Género</th>
                  <th style={{ padding: "0.8rem", textAlign: "left", color: "#a855f7" }}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #2d2d4e" }}>
                    <td style={{ padding: "0.8rem" }}>{u.nombre}</td>
                    <td style={{ padding: "0.8rem" }}>{u.genero || "-"}</td>
                    <td style={{ padding: "0.8rem" }}>{u.meta || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {seccion === "ejercicios" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#a855f7" }}>Ejercicios ({ejercicios.length})</h2>
              <button onClick={() => setMostrarForm(!mostrarForm)}
                style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer" }}>
                + Agregar
              </button>
            </div>
            {mostrarForm && (
              <div style={{ background: "#1a1a2e", padding: "1.5rem", borderRadius: "12px", marginBottom: "1.5rem" }}>
                <input placeholder="Nombre" value={nuevoEjercicio.nombre}
                  onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, nombre: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff", boxSizing: "border-box" }} />
                <input placeholder="Descripción" value={nuevoEjercicio.descripcion}
                  onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, descripcion: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff", boxSizing: "border-box" }} />
                <select value={nuevoEjercicio.grupo_muscular}
                  onChange={e => setNuevoEjercicio({ ...nuevoEjercicio, grupo_muscular: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff" }}>
                  {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={crearEjercicio}
                  style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: "8px", cursor: "pointer" }}>
                  Guardar
                </button>
              </div>
            )}
            {ejercicios.length === 0 && <p style={{ color: "#888" }}>Inicia sesión para ver ejercicios.</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
              {ejercicios.map(e => (
                <div key={e.id} style={{ background: "#1a1a2e", borderRadius: "12px", padding: "1rem", border: "1px solid #2d2d4e" }}>
                  <h4 style={{ color: "#a855f7" }}>{e.nombre}</h4>
                  <p style={{ color: "#aaa", fontSize: "0.85rem" }}>{e.grupo_muscular}</p>
                  <button onClick={() => eliminarEjercicio(e.id)}
                    style={{ marginTop: "0.5rem", background: "#dc2626", color: "#fff", border: "none", padding: "0.3rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {seccion === "rutinas" && (
          <div>
            <h2 style={{ color: "#a855f7", marginBottom: "1.5rem" }}>Rutinas</h2>
            <p style={{ color: "#888" }}>Gestión de rutinas de todos los usuarios.</p>
          </div>
        )}
      </div>
    </div>
  );
}