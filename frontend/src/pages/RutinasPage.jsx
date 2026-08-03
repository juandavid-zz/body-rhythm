import { useState } from "react";

export default function RutinasPage() {
  const [rutinas, setRutinas] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", descripcion: "", nivel: "principiante" });

  const crearRutina = () => {
    if (!nueva.nombre) return;
    const nuevaRutina = { ...nueva, id: Date.now(), es_favorita: false };
    setRutinas([...rutinas, nuevaRutina]);
    setMostrarForm(false);
    setNueva({ nombre: "", descripcion: "", nivel: "principiante" });
  };

  const toggleFavorita = (id) => {
    setRutinas(rutinas.map(r => r.id === id ? { ...r, es_favorita: !r.es_favorita } : r));
  };

  const eliminarRutina = (id) => {
    setRutinas(rutinas.filter(r => r.id !== id));
  };

  return (
    <div style={{ padding: "2rem", background: "#0f0f1a", minHeight: "100vh", color: "#fff", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#a855f7", margin: 0 }}>Mis Rutinas</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer" }}>
          + Nueva Rutina
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#1a1a2e", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
          <h3 style={{ color: "#a855f7", marginTop: 0 }}>Crear Rutina</h3>
          <input placeholder="Nombre de la rutina" value={nueva.nombre}
            onChange={e => setNueva({ ...nueva, nombre: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff", boxSizing: "border-box" }} />
          <input placeholder="Descripción" value={nueva.descripcion}
            onChange={e => setNueva({ ...nueva, descripcion: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "0.8rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff", boxSizing: "border-box" }} />
          <select value={nueva.nivel} onChange={e => setNueva({ ...nueva, nivel: e.target.value })}
            style={{ width: "100%", padding: "0.6rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #a855f7", background: "#0f0f1a", color: "#fff" }}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={crearRutina}
              style={{ background: "#a855f7", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: "8px", cursor: "pointer" }}>
              Guardar
            </button>
            <button onClick={() => setMostrarForm(false)}
              style={{ background: "transparent", color: "#aaa", border: "1px solid #444", padding: "0.6rem 1.5rem", borderRadius: "8px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {rutinas.length === 0 && !mostrarForm && (
        <p style={{ color: "#888" }}>No tienes rutinas aún. Crea tu primera rutina de entrenamiento.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {rutinas.map(r => (
          <div key={r.id} style={{ background: "#1a1a2e", borderRadius: "12px", padding: "1.5rem", border: "1px solid #2d2d4e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#a855f7", margin: 0 }}>{r.nombre}</h3>
              <button onClick={() => toggleFavorita(r.id)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>
                {r.es_favorita ? "⭐" : "☆"}
              </button>
            </div>
            <p style={{ color: "#aaa", fontSize: "0.9rem", marginTop: "0.5rem" }}>{r.descripcion}</p>
            <span style={{ background: "#2d2d4e", padding: "0.3rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem", color: "#a855f7" }}>
              {r.nivel}
            </span>
            <div style={{ marginTop: "1rem" }}>
              <button onClick={() => eliminarRutina(r.id)}
                style={{ background: "#dc2626", color: "#fff", border: "none", padding: "0.3rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}