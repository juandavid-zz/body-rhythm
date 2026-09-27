// Utilidades locales para complementar el backend mientras no existan
// endpoints de "emoji de rutina" ni de "historial de entrenamientos".
// Todo se guarda en localStorage.

const EMOJI_KEY = "br_rutina_emojis";
const HISTORIAL_KEY = "br_historial_entrenamientos";

export const EMOJIS_DISPONIBLES = ["💪", "🔥", "🏋️", "🦍", "🪵", "🐍", "⚡", "🎯", "🧘", "🏃"];

function leerJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getEmoji(rutinaId) {
  const mapa = leerJSON(EMOJI_KEY, {});
  return mapa[rutinaId] || "💪";
}

export function setEmoji(rutinaId, emoji) {
  const mapa = leerJSON(EMOJI_KEY, {});
  mapa[rutinaId] = emoji;
  localStorage.setItem(EMOJI_KEY, JSON.stringify(mapa));
}

export function getHistorial() {
  return leerJSON(HISTORIAL_KEY, []);
}

export function guardarEntrenamiento(entrada) {
  const historial = getHistorial();
  historial.unshift(entrada);
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial.slice(0, 100)));
}