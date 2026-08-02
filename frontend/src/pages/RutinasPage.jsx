import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000/api";

export default function RutinasPage() {
  const [rutinas, setRutinas] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", descripcion: "", nivel: "principiante" });
  const usuarioId = 1; // temporal

  useEffect(() => {
    fetch(`${API}/usuarios/${usuarioId}/rutinas/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(setRutinas)
      .catch(() => setRutinas([]));

    fetch(`${API}/ejercicios/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(setEjercicios)
      .catch(() => setEjercicios([]));
  }, []);

  const crearRutina = () => {
    fetch(`${API}/usuarios/${usuarioId}/rutinas/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(nueva)
    })
      .then(r => r.json())
      .then(r => { setRutinas([...rutinas, r]); setMostrarForm(false); setNueva({ nombre: "", descripcion: "", nivel: "principiante" }); });
  };

  const toggleFavorita = (id) => {
    fetch(`${API}/usuarios/${usuarioId}/rutinas/${id}/favorita/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(data => setRutinas(rutinas.map(r => r.id === id ? { ...r, es_favorita: data.es_favorita } : r)));
  };

  return (
    <div style={{ padding: "2rem", background: "#0f0f1a", minHeight: "100vh", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#a855f7" }}>Mis Rutinas</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer" }}>
          + Nueva Rutina
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#1a1a2e", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
          <h3 style={{ color: "#a855f7", marginBottom: "1rem" }}>Crear Rutina</h3>
          <input placeholder="Nombre" value={nueva.nombre}
            onChange={e => setNueva({ ...nueva, nombre: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff" }} />
          <input placeholder="Descripción" value={nueva.descripcion}
            onChange={e => setNueva({ ...nueva, descripcion: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff" }} />
          <select value={nueva.nivel} onChange={e => setNueva({ ...nueva, nivel: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff" }}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
          <button onClick={crearRutina}
            style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: "8px", cursor: "pointer" }}>
            Guardar
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {rutinas.length === 0 && <p style={{ color: "#888" }}>No tienes rutinas aún.</p>}
        {rutinas.map(r => (
          <div key={r.id} style={{ background: "#1a1a2e", borderRadius: "12px", padding: "1.5rem", border: "1px solid #2d2d4e" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ color: "#a855f7" }}>{r.nombre}</h3>
              <button onClick={() => toggleFavorita(r.id)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>
                {r.es_favorita ? "⭐" : "☆"}
              </button>
            </div>
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>{r.descripcion}</p>
            <span style={{ background: "#2d2d4e", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem", color: "#a855f7" }}>
              {r.nivel}
            </span>
            <div style={{ marginTop: "1rem" }}>
              <p style={{ color: "#888", fontSize: "0.85rem" }}>Ejercicios: {r.ejercicios_detalle?.length || 0}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}