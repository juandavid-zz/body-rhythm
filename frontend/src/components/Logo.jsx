import { useId } from "react";

/**
 * Logo de Body Rhythm: un ícono tipo app (cuadrado redondeado con el
 * degradado de la marca y una onda, el "ritmo") y el nombre en blanco,
 * "Body" en seminegrita y "Rhythm" en peso normal.
 */
export default function Logo({ conNombre = true }) {
  // Ids únicos: el logo puede aparecer más de una vez en la misma página
  const id = useId().replace(/:/g, "");

  return (
    <span className="br-logo">
      <svg className="br-logo-icono" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fondo`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#b26bff" />
            <stop offset="0.55" stopColor="#9b4dff" />
            <stop offset="1" stopColor="#e9478f" />
          </linearGradient>
          <linearGradient id={`${id}-brillo`} x1="20" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Cuadrado redondeado de curva suave, como los íconos de iPhone */}
        <path
          d="M20 1.5c9.6 0 14.4 0 16.5 2.1S38.5 10.4 38.5 20s0 14.4-2.1 16.5S29.6 38.5 20 38.5s-14.4 0-16.5-2.1S1.5 29.6 1.5 20s0-14.4 2.1-16.5S10.4 1.5 20 1.5z"
          fill={`url(#${id}-fondo)`}
        />
        <path
          d="M20 1.5c9.6 0 14.4 0 16.5 2.1S38.5 10.4 38.5 20H1.5c0-9.6 0-14.4 2.1-16.5S10.4 1.5 20 1.5z"
          fill={`url(#${id}-brillo)`}
        />
        {/* La onda: el ritmo */}
        <path
          className="br-logo-onda"
          pathLength="1"
          d="M7 20h2.2c.9 0 1.2-2.6 2-2.6s1.1 6.2 2 6.2 1.4-12.2 2.6-12.2 1.6 17.2 2.8 17.2 1.5-13 2.6-13 1.2 7.2 2.1 7.2.9-2.8 1.7-2.8H33"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {conNombre && (
        <span className="br-logo-nombre">
          Body<span>Rhythm</span>
        </span>
      )}
    </span>
  );
}
