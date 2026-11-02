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


def estado_programa(programa, hoy=None):
    """Lo que muestra la tarjeta del programa (sin serializar la rutina de hoy)."""
    hoy = hoy or hoy_local()
    semana = semana_actual(programa, hoy)
    lunes = lunes_de(hoy)
    desde = datetime.combine(lunes, time.min)
    hasta = desde + timedelta(days=7)

    sesiones = list(programa.sesiones.select_related('rutina'))

    # Entrenamientos de esta semana por rutina (una rutina puede tocar dos veces)
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
