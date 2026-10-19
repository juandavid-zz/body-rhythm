import { useEffect, useState } from "react";
import api from "../../api/api";
import UsuarioFila from "./UsuarioFila";

const TITULOS = { seguidores: "Seguidores", seguidos: "Seguidos" };

/** Lista de seguidores o seguidos de un perfil. En el perfil propio permite quitar seguidores. */
export default function ListaUsuariosModal({ username, tipo, esPropio, onCerrar, onCambio }) {
  const [estado, setEstado] = useState({ cargando: true, usuarios: [], error: "" });

  useEffect(() => {
    let activo = true;
    api
      .get(`/social/perfiles/${username}/${tipo}/`)
      .then((res) => activo && setEstado({ cargando: false, usuarios: res.data, error: "" }))
      .catch((error) => {
        if (activo) {
          setEstado({
            cargando: false,
            usuarios: [],
            error: error.response?.data?.error || "No se pudo cargar la lista.",
          });
        }
      });
    return () => {
      activo = false;
    };
  }, [username, tipo]);

  useEffect(() => {
    const cerrarConEscape = (evento) => evento.key === "Escape" && onCerrar();
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onCerrar]);

  const reemplazar = (actualizado) =>
    setEstado((previo) => ({
      ...previo,
      usuarios: previo.usuarios.map((u) => (u.id === actualizado.id ? actualizado : u)),
    }));

  const quitarSeguidor = async (usuario) => {
    await api.delete(`/social/perfiles/${usuario.username}/seguidor/`);
    setEstado((previo) => ({ ...previo, usuarios: previo.usuarios.filter((u) => u.id !== usuario.id) }));
    onCambio?.();
  };

  return (
    <div className="social-modal-fondo" onClick={onCerrar}>
      <section
        className="social-modal"
        role="dialog"
        aria-modal="true"
        aria-label={TITULOS[tipo]}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header>
          <h2>{TITULOS[tipo]}</h2>
          <button type="button" className="social-modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {estado.cargando && <p className="social-vacio">Cargando…</p>}
        {estado.error && <p className="social-vacio">{estado.error}</p>}
        {!estado.cargando && !estado.error && estado.usuarios.length === 0 && (
          <p className="social-vacio">
            {tipo === "seguidores" ? "Todavía no hay seguidores." : "Todavía no sigue a nadie."}
          </p>
        )}

        <ul className="social-lista-usuarios">
          {estado.usuarios.map((usuario) => (
            <UsuarioFila
              key={usuario.id}
              usuario={usuario}
              onCambio={(actualizado) => {
                reemplazar(actualizado);
                onCambio?.();
              }}
              accion={
                esPropio && tipo === "seguidores" ? (
                  <button type="button" className="social-btn-secundario" onClick={() => quitarSeguidor(usuario)}>
                    Eliminar
                  </button>
                ) : null
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
