import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { tiempoRelativo } from "../../utils/formato";
import Avatar from "./Avatar";

// Igual que en el backend: @ seguido de 3 a 30 letras, números, punto o guion bajo
const MENCION = /(^|[^\w.])@([a-z0-9._]{3,30})/gi;

/** El texto del comentario con cada @usuario convertido en enlace a su perfil. */
function TextoConMenciones({ texto, onIr }) {
  const partes = [];
  let ultimo = 0;
  for (const coincidencia of texto.matchAll(MENCION)) {
    const [completo, antes, username] = coincidencia;
    const inicio = coincidencia.index + antes.length;
    partes.push(texto.slice(ultimo, inicio));
    const limpio = username.replace(/\.+$/, "");
    partes.push(
      <button key={inicio} type="button" className="social-mencion" onClick={() => onIr(limpio)}>
        @{limpio}
      </button>
    );
    ultimo = coincidencia.index + completo.length - (username.length - limpio.length);
  }
  partes.push(texto.slice(ultimo));
  return partes;
}

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
                <strong>@{comentario.usuario.username}</strong>{" "}
                <TextoConMenciones texto={comentario.texto} onIr={(u) => navigate(`/perfil/${u}`)} />
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
          placeholder="Escribe un comentario… (usa @ para mencionar)"
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
