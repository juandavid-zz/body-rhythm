import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Navbar from "../components/Navbar";
import Avatar from "../components/social/Avatar";
import TarjetaEntrenamiento from "../components/social/TarjetaEntrenamiento";
import UsuarioFila from "../components/social/UsuarioFila";
import { tiempoRelativo } from "../utils/formato";
import "../css/social.css";

// ── Izquierda: mi perfil en pequeño ──
function MiTarjeta() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        let username = localStorage.getItem("username");
        if (!username) {
          username = (await api.get("/usuarios/me/")).data.username;
          localStorage.setItem("username", username);
        }
        const res = await api.get(`/social/perfiles/${username}/`);
        if (activo) setPerfil(res.data);
      } catch {
        if (activo) setPerfil(null);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (!perfil) return <section className="social-panel social-mi-tarjeta social-cargando" aria-hidden="true" />;

  return (
    <section className="social-panel social-mi-tarjeta">
      <button type="button" className="social-mi-identidad" onClick={() => navigate(`/perfil/${perfil.username}`)}>
        <Avatar nombre={perfil.nombre} grande />
        <strong>{perfil.nombre}</strong>
        <span>@{perfil.username}</span>
      </button>
      <button type="button" className="social-link social-mi-config" onClick={() => navigate("/configuracion")}>
        {perfil.cuenta_privada ? "🔒 Cuenta privada" : "Cuenta pública"} · Configuración
      </button>
      <dl className="social-mis-numeros">
        <div>
          <dt>Entrenamientos</dt>
          <dd>{perfil.entrenamientos}</dd>
        </div>
        <div>
          <dt>Seguidores</dt>
          <dd>{perfil.seguidores}</dd>
        </div>
        <div>
          <dt>Seguidos</dt>
          <dd>{perfil.seguidos}</dd>
        </div>
      </dl>
    </section>
  );
}

// ── Izquierda: solicitudes de seguimiento recibidas ──
function Solicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    let activo = true;
    api
      .get("/social/solicitudes/")
      .then((res) => activo && setSolicitudes(res.data))
      .catch(() => activo && setSolicitudes([]));
    return () => {
      activo = false;
    };
  }, []);

  const responder = async (solicitud, aceptar) => {
    const ruta = `/social/solicitudes/${solicitud.id}/`;
    if (aceptar) await api.post(ruta);
    else await api.delete(ruta);
    setSolicitudes(solicitudes.filter((s) => s.id !== solicitud.id));
  };

  if (!solicitudes.length) return null;

  return (
    <section className="social-panel social-solicitudes">
      <h2 className="social-panel-titulo">
        Solicitudes <span className="social-badge">{solicitudes.length}</span>
      </h2>
      <ul>
        {solicitudes.map((s) => (
          <li key={s.id}>
            <button type="button" className="social-usuario-info" onClick={() => navigate(`/perfil/${s.usuario.username}`)}>
              <Avatar nombre={s.usuario.nombre} />
              <span className="social-usuario-textos">
                <strong>{s.usuario.nombre}</strong>
                <span>@{s.usuario.username} · {tiempoRelativo(s.created_at)}</span>
              </span>
            </button>
            <div className="social-acciones">
              <button type="button" className="social-btn-primario" onClick={() => responder(s, true)}>
                Aceptar
              </button>
              <button type="button" className="social-btn-secundario" onClick={() => responder(s, false)}>
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Centro: feed de las cuentas que sigo ──
function Feed() {
  const navigate = useNavigate();
  const miUsername = localStorage.getItem("username");
  const [estado, setEstado] = useState({ cargando: true, publicaciones: [], siguiente: null, error: "" });

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

  const verMas = async () => {
    setEstado((p) => ({ ...p, cargando: true }));
    try {
      const res = await api.get("/social/feed/", { params: { pagina: estado.siguiente } });
      setEstado((p) => ({
        cargando: false,
        error: "",
        siguiente: res.data.siguiente_pagina,
        publicaciones: [...p.publicaciones, ...res.data.resultados],
      }));
    } catch {
      setEstado((p) => ({ ...p, cargando: false, error: "No se pudo cargar más." }));
    }
  };

  const actualizar = (registro) =>
    setEstado((p) => ({
      ...p,
      publicaciones: p.publicaciones.map((x) => (x.id === registro.id ? registro : x)),
    }));

  if (!estado.cargando && !estado.error && estado.publicaciones.length === 0) {
    return (
      <div className="social-panel social-vacio-grande">
        <h3>Tu feed está vacío</h3>
        <p>Sigue a otras personas para ver sus entrenamientos aquí, o termina una rutina para publicar el tuyo.</p>
        <button type="button" className="social-btn-primario" onClick={() => navigate("/rutinas")}>
          Empezar a entrenar
        </button>
      </div>
    );
  }

  return (
    <div className="social-feed">
      {estado.publicaciones.map((registro) => (
        <TarjetaEntrenamiento
          key={registro.id}
          registro={registro}
          mostrarAutor
          esPropio={registro.usuario.username === miUsername}
          onActualizar={actualizar}
        />
      ))}
      {estado.error && <p className="social-vacio">{estado.error}</p>}
      {estado.cargando && <p className="social-vacio">Cargando…</p>}
      {!estado.cargando && estado.siguiente && (
        <button type="button" className="social-btn-secundario social-ver-mas" onClick={verMas}>
          Ver más
        </button>
      )}
    </div>
  );
}

// ── Derecha: búsqueda dinámica (espera 300 ms entre teclas) ──
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
        if (activo) setResultado({ q, usuarios: [], error: "No se pudo buscar." });
      }
    }, 300);
    return () => {
      activo = false;
      clearTimeout(id);
    };
  }, [q]);

  const listo = q && resultado.q === q;

  const reemplazar = (actualizado) =>
    setResultado((p) => ({ ...p, usuarios: p.usuarios.map((u) => (u.id === actualizado.id ? actualizado : u)) }));

  return (
    <section className="social-panel social-buscar">
      <div className="social-buscador">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Buscar personas"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Buscar por @usuario o nombre"
        />
      </div>

      {q && !listo && <p className="social-vacio">Buscando…</p>}
      {listo && resultado.error && <p className="social-vacio">{resultado.error}</p>}
      {listo && !resultado.error && resultado.usuarios.length === 0 && (
        <p className="social-vacio">No encontramos a nadie con “{q}”.</p>
      )}
      {listo && resultado.usuarios.length > 0 && (
        <ul className="social-lista-usuarios">
          {resultado.usuarios.map((usuario) => (
            <UsuarioFila key={usuario.id} usuario={usuario} onCambio={reemplazar} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Derecha: a quién seguir ──
function Sugerencias() {
  const [sugerencias, setSugerencias] = useState(null);

  useEffect(() => {
    let activo = true;
    api
      .get("/social/sugerencias/")
      .then((res) => activo && setSugerencias(res.data))
      .catch(() => activo && setSugerencias([]));
    return () => {
      activo = false;
    };
  }, []);

  if (!sugerencias || sugerencias.length === 0) return null;

  const reemplazar = (actualizado) => setSugerencias(sugerencias.map((u) => (u.id === actualizado.id ? actualizado : u)));

  return (
    <section className="social-panel social-sugerencias">
      <h2 className="social-panel-titulo">A quién seguir</h2>
      <ul className="social-lista-usuarios">
        {sugerencias.map((usuario) => (
          <UsuarioFila key={usuario.id} usuario={usuario} onCambio={reemplazar} />
        ))}
      </ul>
    </section>
  );
}

export default function ComunidadPage() {
  return (
    <>
      <Navbar />
      <main className="social-page">
        <div className="social-layout">
          {/* Columnas laterales independientes (fijas al hacer scroll, como en Strava) */}
          <aside className="social-col">
            <div className="social-area-perfil">
              <MiTarjeta />
            </div>
            <div className="social-area-solicitudes">
              <Solicitudes />
            </div>
          </aside>

          <div className="social-area-feed">
            <h1 className="social-titulo">Comunidad</h1>
            <Feed />
          </div>

          <aside className="social-col">
            <div className="social-area-buscar">
              <Buscar />
            </div>
            <div className="social-area-sugerencias">
              <Sugerencias />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
