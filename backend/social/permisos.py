"""Reglas de visibilidad del módulo social."""

from .models import Seguimiento


def es_seguidor_aceptado(visitante, dueno):
    return Seguimiento.objects.filter(
        seguidor=visitante,
        seguido=dueno,
        estado=Seguimiento.ACEPTADO,
    ).exists()


def puede_ver_contenido(visitante, dueno):
    """El dueño y sus seguidores aceptados ven sus entrenamientos y listas."""
    return visitante.id == dueno.id or es_seguidor_aceptado(visitante, dueno)


def ids_visibles_en_feed(usuario):
    """Ids de usuarios cuyos entrenamientos compartidos aparecen en el feed."""
    seguidos = Seguimiento.objects.filter(
        seguidor=usuario,
        estado=Seguimiento.ACEPTADO,
    ).values_list('seguido_id', flat=True)
    return [usuario.id, *seguidos]
