"""
Estado de un programa de varias semanas: en qué semana vas, qué sesiones ya
hiciste esta semana, cuál toca hoy y si es semana de descarga.

Una sesión cuenta como hecha si esta semana (de lunes a domingo) terminaste un
entrenamiento de esa rutina, sin importar el día. Por eso, si faltas un día, el
programa no se atrasa: "hoy toca" es simplemente la siguiente pendiente.
"""

from datetime import datetime, time, timedelta

from .models import RegistroEntrenamiento, hoy as hoy_local


def lunes_de(dia):
    return dia - timedelta(days=dia.weekday())


def semana_actual(programa, hoy=None):
    """Número de semana (la primera es 1), contando desde el lunes en que empezó."""
    hoy = hoy or hoy_local()
    return (lunes_de(hoy) - lunes_de(programa.inicio)).days // 7 + 1


def es_descarga(programa, semana):
    return bool(programa.descarga_cada) and semana % programa.descarga_cada == 0


def descarga_activa(usuario, hoy=None):
    """True si el usuario tiene un programa en curso y esta es su semana de descarga."""
    programa = usuario.programas.filter(activo=True).first()
    if programa is None:
        return False
    semana = semana_actual(programa, hoy)
    return semana <= programa.semanas and es_descarga(programa, semana)


def rango_semana(lunes):
    desde = datetime.combine(lunes, time.min)
    return desde, desde + timedelta(days=7)


def sesiones_hechas(programa, sesiones, desde, hasta):
    """[{sesion, hecha}] según los entrenamientos de esas rutinas entre las dos fechas."""
    # Entrenamientos por rutina (una rutina puede tocar dos veces en la semana)
    pendientes_por_rutina = {}
    for rutina_id in (
        RegistroEntrenamiento.objects
        .filter(usuario=programa.usuario, fecha__gte=desde, fecha__lt=hasta, rutina_id__in=[s.rutina_id for s in sesiones])
        .values_list('rutina_id', flat=True)
    ):
        pendientes_por_rutina[rutina_id] = pendientes_por_rutina.get(rutina_id, 0) + 1

    filas = []
    for sesion in sesiones:
        hecha = pendientes_por_rutina.get(sesion.rutina_id, 0) > 0
        if hecha:
            pendientes_por_rutina[sesion.rutina_id] -= 1
        filas.append({'sesion': sesion, 'hecha': hecha})
    return filas


def estado_programa(programa, hoy=None):
    """Lo que muestra la tarjeta del programa (sin serializar la rutina de hoy)."""
    hoy = hoy or hoy_local()
    semana = semana_actual(programa, hoy)
    desde, hasta = rango_semana(lunes_de(hoy))
    sesiones = list(programa.sesiones.select_related('rutina'))
    filas = sesiones_hechas(programa, sesiones, desde, hasta)

    terminado = semana > programa.semanas
    siguiente = None if terminado else next((f['sesion'] for f in filas if not f['hecha']), None)

    return {
        'semana': min(semana, programa.semanas),
        'terminado': terminado,
        'descarga': not terminado and es_descarga(programa, semana),
        'sesiones': filas,
        'siguiente': siguiente,
        'semana_completa': not terminado and bool(filas) and all(f['hecha'] for f in filas),
    }


def datos_semana_anterior(programa, hoy=None):
    """
    Números de la semana pasada del programa, para el resumen. None en la
    primera semana (todavía no hay semana pasada) o si el programa terminó hace tiempo.
    """
    hoy = hoy or hoy_local()
    semana = semana_actual(programa, hoy)
    if semana < 2 or semana > programa.semanas + 1:
        return None

    lunes = lunes_de(hoy) - timedelta(days=7)
    desde, hasta = rango_semana(lunes)
    desde_previa, _ = rango_semana(lunes - timedelta(days=7))

    sesiones = list(programa.sesiones.select_related('rutina'))
    filas = sesiones_hechas(programa, sesiones, desde, hasta)

    registros = list(
        RegistroEntrenamiento.objects
        .filter(usuario=programa.usuario, fecha__gte=desde_previa, fecha__lt=hasta)
        .only('fecha', 'volumen_kg', 'duracion_segundos', 'records')
    )
    de_la_semana = [r for r in registros if r.fecha >= desde]
    de_la_previa = [r for r in registros if r.fecha < desde]

    volumen = round(sum(r.volumen_kg for r in de_la_semana))
    volumen_previo = round(sum(r.volumen_kg for r in de_la_previa))
    records = [rec.get('ejercicio') for r in de_la_semana for rec in (r.records or []) if rec.get('ejercicio')]

    return {
        'semana': semana - 1,
        'total_semanas': programa.semanas,
        'fue_descarga': es_descarga(programa, semana - 1),
        'sesiones_hechas': sum(1 for f in filas if f['hecha']),
        'sesiones_planeadas': len(filas),
        'sesiones_pendientes': [f['sesion'].rutina.nombre for f in filas if not f['hecha']],
        'entrenamientos': len(de_la_semana),
        'minutos': round(sum(r.duracion_segundos for r in de_la_semana) / 60),
        'volumen_kg': volumen,
        'cambio_volumen_pct': round((volumen - volumen_previo) / volumen_previo * 100) if volumen_previo else None,
        'records': records[:5],
    }


def resumen_sin_ia(datos):
    """El mismo resumen en una frase armada a mano (si la IA no responde)."""
    partes = [f"Completaste {datos['sesiones_hechas']} de {datos['sesiones_planeadas']} sesiones la semana {datos['semana']}."]
    if datos['records']:
        partes.append(f"Lograste {len(datos['records'])} récord(s), entre ellos en {datos['records'][0]}.")
    if datos['cambio_volumen_pct'] is not None:
        signo = 'más' if datos['cambio_volumen_pct'] >= 0 else 'menos'
        partes.append(f"Moviste un {abs(datos['cambio_volumen_pct'])} % {signo} de volumen que la semana anterior.")
    if datos['sesiones_pendientes']:
        partes.append(f"Esta semana intenta no saltarte {datos['sesiones_pendientes'][0]}.")
    return ' '.join(partes)
