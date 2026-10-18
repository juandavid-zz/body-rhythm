import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import Navbar from "../components/Navbar";
import TarjetaEntrenamiento from "../components/social/TarjetaEntrenamiento";
import UsuarioFila from "../components/social/UsuarioFila";
import Avatar from "../components/social/Avatar";
import { tiempoRelativo } from "../utils/formato";
import "../css/social.css";

const PESTANAS = [
  { id: "feed", label: "Feed" },
  { id: "buscar", label: "Buscar" },
  { id: "solicitudes", label: "Solicitudes" },
];

// ── Feed: entrenamientos compartidos por las cuentas que sigo ──
function Feed() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ cargando: true, publicaciones: [], siguiente: 1, error: "" });

  const cargar = useCallback(async (pagina, reemplazar) => {
    try {
      const res = await api.get("/social/feed/", { params: { pagina } });
      setEstado((previo) => ({
        cargando: false,
        error: "",
        siguiente: res.data.siguiente_pagina,
        publicaciones: reemplazar ? res.data.resultados : [...previo.publicaciones, ...res.data.resultados],
      }));
    } catch {
      setEstado((previo) => ({ ...previo, cargando: false, error: "No se pudo cargar el feed." }));
    }
  }, []);

  useEffect(() => {
    let activo = true;
    api
      .get("/social/feed/", { params: { pagina: 1 } })
      .then((res) => {
        if (activo) {
          setEstado({ cargando: false, error: "", siguiente: res.data.siguiente_pagina, publicaciones: res.data.resultados });
        }
      })
      .catch(() => activo && setEstado((p) => ({ ...p, cargando: false, error: "No se pudo cargar el feed." })));
    return () => {
      activo = false;
    };
  }, []);

  const verMas = () => {
    setEstado((previo) => ({ ...previo, cargando: true }));
    cargar(estado.siguiente, false);
  };

  const actualizar = (registro) =>
    setEstado((previo) => ({
      ...previo,
      publicaciones: previo.publicaciones.map((p) => (p.id === registro.id ? registro : p)),
    }));

  const miUsername = localStorage.getItem("username");

  if (!estado.cargando && !estado.error && estado.publicaciones.length === 0) {
    return (
      <div className="social-vacio-grande">
        <span>🏋️</span>
        <h3>Tu feed está vacío</h3>
        <p>Sigue a otras personas para ver sus entrenamientos, o termina una rutina para publicar el tuyo.</p>
        <button type="button" className="social-btn-primario" onClick={() => navigate("/comunidad?pestana=buscar")}>
          Buscar personas
        </button>
      </div>
    );
  }

  return (
    <div className="social-feed">
      {estado.error && <p className="social-vacio">{estado.error}</p>}
      {estado.publicaciones.map((registro) => (
        <TarjetaEntrenamiento
          key={registro.id}
          registro={registro}
          mostrarAutor
          esPropio={registro.usuario.username === miUsername}
          onActualizar={actualizar}
        />
      ))}
      {estado.cargando && <p className="social-vacio">Cargando…</p>}
      {!estado.cargando && estado.siguiente && (
        <button type="button" className="social-btn-secundario social-ver-mas" onClick={verMas}>
          Ver más
        </button>
      )}
    </div>
  );
}

// ── Búsqueda dinámica por @username o nombre (espera 300 ms entre teclas) ──
function Buscar() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState({ q: "", usuarios: [], error: "" });
  const q = texto.trim().replace(/^@+/, "");

  useEffect(() => {
    if (!q) return undefined;
    let activo = true;
    const id = setTimeout(async () => {
      try {
        const res = await api.get("/social/buscar/", { params: { q } });
        if (activo) setResultado({ q, usuarios: res.data, error: "" });
      } catch {
        if (activo) setResultado({ q, usuarios: [], error: "No se pudo buscar. Intenta de nuevo." });
      }
    }, 300);
    return () => {
      activo = false;
      clearTimeout(id);
    };
  }, [q]);

  const listo = q && resultado.q === q;
  const usuarios = listo ? resultado.usuarios : [];

  const reemplazar = (actualizado) =>
    setResultado((previo) => ({
      ...previo,
      usuarios: previo.usuarios.map((u) => (u.id === actualizado.id ? actualizado : u)),
    }));

  return (
    <div className="social-buscar">
      <div className="social-buscador">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Buscar por @usuario o nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          aria-label="Buscar personas"
        />
      </div>

      {!q && <p className="social-vacio">Escribe un nombre o @usuario para encontrar personas.</p>}
      {q && !listo && <p className="social-vacio">Buscando…</p>}
      {listo && resultado.error && <p className="social-vacio">{resultado.error}</p>}
      {listo && !resultado.error && usuarios.length === 0 && (
        <p className="social-vacio">No encontramos a nadie con “{q}”.</p>
      )}

      <ul className="social-lista-usuarios">
        {usuarios.map((usuario) => (
          <UsuarioFila key={usuario.id} usuario={usuario} onCambio={reemplazar} />
        ))}
      </ul>
    </div>
  );
}

// ── Solicitudes de seguimiento recibidas ──
function Solicitudes({ onCambioTotal }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState({ cargando: true, solicitudes: [] });

  useEffect(() => {
    let activo = true;
    api
      .get("/social/solicitudes/")
      .then((res) => activo && setEstado({ cargando: false, solicitudes: res.data }))
      .catch(() => activo && setEstado({ cargando: false, solicitudes: [] }));
    return () => {
      activo = false;
    };
  }, []);

  const responder = async (solicitud, aceptar) => {
    if (aceptar) {
      await api.post(`/social/solicitudes/${solicitud.id}/`);
    } else {
      await api.delete(`/social/solicitudes/${solicitud.id}/`);
    }
    const restantes = estado.solicitudes.filter((s) => s.id !== solicitud.id);
    setEstado({ ...estado, solicitudes: restantes });
    onCambioTotal(restantes.length);
  };

  if (estado.cargando) return <p className="social-vacio">Cargando…</p>;
  if (!estado.solicitudes.length) {
    return <p className="social-vacio">No tienes solicitudes pendientes.</p>;
  }

  return (
    <ul className="social-lista-usuarios">
      {estado.solicitudes.map((solicitud) => (
        <li key={solicitud.id} className="social-usuario-fila">
          <button
            type="button"
            className="social-usuario-info"
            onClick={() => navigate(`/perfil/${solicitud.usuario.username}`)}
          >
            <Avatar nombre={solicitud.usuario.nombre} />
            <span className="social-usuario-textos">
              <strong>{solicitud.usuario.nombre}</strong>
              <span>@{solicitud.usuario.username} · {tiempoRelativo(solicitud.created_at)}</span>
            </span>
          </button>
          <div className="social-acciones">
            <button type="button" className="social-btn-primario" onClick={() => responder(solicitud, true)}>
              Aceptar
            </button>
            <button type="button" className="social-btn-secundario" onClick={() => responder(solicitud, false)}>
              Rechazar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ComunidadPage() {
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.some((p) => p.id === params.get("pestana")) ? params.get("pestana") : "feed";
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    api
      .get("/social/solicitudes/")
      .then((res) => setPendientes(res.data.length))
      .catch(() => setPendientes(0));
  }, []);

  return (
    <>
      <Navbar />
      <main className="social-page">
        <div className="social-contenedor">
          <header className="social-hero">
            <span className="social-kicker">Comunidad</span>
            <h1>Entrena acompañado</h1>
            <p>Sigue a otras personas y mira cómo progresan sus entrenamientos.</p>
          </header>

          <nav className="social-pestanas" aria-label="Secciones de la comunidad">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={pestana === p.id ? "activa" : ""}
                onClick={() => setParams({ pestana: p.id })}
                aria-current={pestana === p.id ? "page" : undefined}
              >
                {p.label}
                {p.id === "solicitudes" && pendientes > 0 && <span className="social-badge">{pendientes}</span>}
              </button>
            ))}
          </nav>

          {pestana === "feed" && <Feed />}
          {pestana === "buscar" && <Buscar />}
          {pestana === "solicitudes" && <Solicitudes onCambioTotal={setPendientes} />}
        </div>
      </main>
    </>
  );
}
