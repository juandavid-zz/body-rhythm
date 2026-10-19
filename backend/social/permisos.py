"""Reglas de visibilidad del módulo social."""

from .models import Seguimiento


def es_seguidor_aceptado(visitante, dueno):
    return Seguimiento.objects.filter(
        seguidor=visitante,
        seguido=dueno,
        estado=Seguimiento.ACEPTADO,
    ).exists()


def puede_ver_contenido(visitante, dueno):
    """
    Cuenta pública: cualquiera con sesión ve sus entrenamientos compartidos y sus listas.
    Cuenta privada: solo el dueño y sus seguidores aceptados.
    """
    return (
        visitante.id == dueno.id
        or not dueno.cuenta_privada
        or es_seguidor_aceptado(visitante, dueno)
    )


def ids_visibles_en_feed(usuario):
    """Ids de usuarios cuyos entrenamientos compartidos aparecen en el feed."""
    seguidos = Seguimiento.objects.filter(
        seguidor=usuario,
        estado=Seguimiento.ACEPTADO,
    ).values_list('seguido_id', flat=True)
    return [usuario.id, *seguidos]


def puede_interactuar(visitante, registro):
    """Dar fuerza y comentar: el dueño, o quien puede ver el entrenamiento si está compartido."""
    if registro.usuario_id == visitante.id:
        return True
    return registro.compartido and puede_ver_contenido(visitante, registro.usuario)
