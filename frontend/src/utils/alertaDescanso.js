// Aviso cuando termina un descanso: vibración, un pitido corto y, si la app
// está en segundo plano (otra app o pantalla bloqueada), una notificación.

const CLAVE_PERMISO_PEDIDO = 'br-notificaciones-pedidas'
let audio = null

/**
 * Llamar desde un toque del usuario (al marcar una serie): los navegadores solo
 * dejan sonar audio y pedir permisos después de una interacción.
 */
export function prepararAlertas() {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext
    if (Contexto && !audio) audio = new Contexto()
    if (audio?.state === 'suspended') audio.resume()
  } catch {
    audio = null
  }

  // El permiso de notificaciones se pide una sola vez, al primer descanso
  try {
    if ('Notification' in window && Notification.permission === 'default' && !localStorage.getItem(CLAVE_PERMISO_PEDIDO)) {
      localStorage.setItem(CLAVE_PERMISO_PEDIDO, '1')
      Notification.requestPermission().catch(() => {})
    }
  } catch {
    // sin localStorage o sin notificaciones: queda el sonido y la vibración
  }
}

function pitido() {
  if (!audio) return
  try {
    // Dos tonos cortos
    ;[0, 0.22].forEach((retraso) => {
      const osc = audio.createOscillator()
      const volumen = audio.createGain()
      const inicio = audio.currentTime + retraso
      osc.type = 'sine'
      osc.frequency.value = 880
      volumen.gain.setValueAtTime(0.0001, inicio)
      volumen.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02)
      volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.18)
      osc.connect(volumen).connect(audio.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.2)
    })
  } catch {
    // sin audio
  }
}

async function notificar(texto) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opciones = { body: texto, icon: '/icons/icono-192.png', tag: 'descanso', renotify: true }
  try {
    // En el celular las notificaciones se muestran a través del service worker
    const registro = await navigator.serviceWorker?.getRegistration()
    if (registro) await registro.showNotification('Descanso terminado', opciones)
    else new Notification('Descanso terminado', opciones)
  } catch {
    // el navegador no permite notificaciones aquí
  }
}

/** Avisa que terminó el descanso de `ejercicio`. */
export function avisarFinDescanso(ejercicio) {
  navigator.vibrate?.([200, 100, 200])
  pitido()
  if (document.visibilityState === 'hidden') {
    notificar(ejercicio ? `Siguiente serie de ${ejercicio}` : 'Vamos con la siguiente serie')
  }
}
