import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { tiempoRelativo } from "../../utils/formato";
import Avatar from "./Avatar";

/** Comentarios de un entrenamiento: lista, nuevo comentario y borrar los propios. */
export default function Comentarios({ registroId, esDuenoDelEntrenamiento, onCambioTotal }) {
  const navigate = useNavigate();
  const miUsername = localStorage.getItem("username");
  const [estado, setEstado] = useState({ cargando: true, lista: [], error: "" });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    api
      .get(`/social/registros/${registroId}/comentarios/`)
      .then((res) => activo && setEstado({ cargando: false, lista: res.data, error: "" }))
      .catch(() => activo && setEstado({ cargando: false, lista: [], error: "No se pudieron cargar los comentarios." }));
    return () => {
      activo = false;
    };
  }, [registroId]);

  const actualizarLista = (lista) => {
    setEstado((previo) => ({ ...previo, lista }));
    onCambioTotal?.(lista.length);
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const res = await api.post(`/social/registros/${registroId}/comentarios/`, { texto });
      actualizarLista([...estado.lista, res.data]);
      setTexto("");
    } catch (error) {
      setEstado((previo) => ({ ...previo, error: error.response?.data?.texto?.[0] || "No se pudo comentar." }));
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async (comentario) => {
    await api.delete(`/social/comentarios/${comentario.id}/`);
    actualizarLista(estado.lista.filter((c) => c.id !== comentario.id));
  };

  return (
    <section className="social-comentarios" aria-label="Comentarios">
      {estado.cargando && <p className="social-vacio">Cargando…</p>}
      {estado.error && <p className="social-vacio">{estado.error}</p>}

      <ul>
        {estado.lista.map((comentario) => (
          <li key={comentario.id}>
            <button
              type="button"
              className="social-comentario-avatar"
              onClick={() => navigate(`/perfil/${comentario.usuario.username}`)}
              aria-label={`Ver perfil de @${comentario.usuario.username}`}
            >
              <Avatar nombre={comentario.usuario.nombre} />
            </button>
            <div className="social-comentario-cuerpo">
              <p>
                <strong>@{comentario.usuario.username}</strong> {comentario.texto}
              </p>
              <span>
                {tiempoRelativo(comentario.created_at)}
                {(comentario.usuario.username === miUsername || esDuenoDelEntrenamiento) && (
                  <button type="button" className="social-link" onClick={() => borrar(comentario)}>
                    Eliminar
                  </button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <form className="social-comentar" onSubmit={enviar}>
        <input
          type="text"
          placeholder="Escribe un comentario…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          aria-label="Escribe un comentario"
        />
        <button type="submit" disabled={enviando || !texto.trim()}>
          Publicar
        </button>
      </form>
    </section>
  );
}
