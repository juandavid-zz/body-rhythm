import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import BotonSeguir from "./BotonSeguir";

/** Fila de un usuario en búsquedas y listas: avatar, nombre, @username y botón de seguir. */
export default function UsuarioFila({ usuario, onCambio, accion }) {
  const navigate = useNavigate();

  return (
    <li className="social-usuario-fila">
      <button
        type="button"
        className="social-usuario-info"
        onClick={() => navigate(`/perfil/${usuario.username}`)}
      >
        <Avatar nombre={usuario.nombre} foto={usuario.foto} />
        <span className="social-usuario-textos">
          <strong>{usuario.nombre}</strong>
          <span>
            @{usuario.username}
            {usuario.te_sigue && <em className="social-te-sigue">Te sigue</em>}
          </span>
        </span>
      </button>

      {accion || (
        <BotonSeguir
          usuario={usuario}
          onCambio={(relacion) => onCambio?.({ ...usuario, relacion })}
        />
      )}
    </li>
  );
}
