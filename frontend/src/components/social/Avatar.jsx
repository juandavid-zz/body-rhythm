import { useState } from "react";
import { iniciales } from "../../utils/formato";
import { urlFoto } from "../../utils/foto";

/** Foto de perfil redonda; si no hay foto (o no carga), las iniciales sobre el degradado. */
export default function Avatar({ nombre, foto = null, grande = false }) {
  const [fallo, setFallo] = useState(null);
  const src = urlFoto(foto);
  const mostrarFoto = src && fallo !== src;

  return (
    <span className={`social-avatar ${grande ? "grande" : ""} ${mostrarFoto ? "con-foto" : ""}`} aria-hidden="true">
      {mostrarFoto ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFallo(src)} />
      ) : (
        iniciales(nombre)
      )}
    </span>
  );
}
