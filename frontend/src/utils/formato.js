// Formatos compartidos por el perfil y el feed

export function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

export function formatearDuracion(segundos = 0) {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  if (horas) return `${horas} h ${minutos} min`;
  if (minutos) return `${minutos} min`;
  return `${total} s`;
}

const UNIDADES = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function tiempoRelativo(fecha) {
  const segundos = (new Date(fecha).getTime() - Date.now()) / 1000;
  for (const [unidad, tamano] of UNIDADES) {
    if (Math.abs(segundos) >= tamano) {
      return relativo.format(Math.round(segundos / tamano), unidad);
    }
  }
  return "hace un momento";
}

export function formatearNumero(valor) {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(valor || 0);
}
