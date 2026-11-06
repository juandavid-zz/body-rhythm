"""Crear notificaciones y encontrar menciones (@usuario) en los comentarios."""

import re

from users.models import Usuario

from .models import Notificacion
from .permisos import puede_interactuar

# Mismo formato que los @username (ver USERNAME_REGEX): 3 a 30 de a-z, 0-9, punto y guion bajo
PATRON_MENCION = re.compile(r'(?<![\w.])@([a-z0-9._]{3,30})', re.IGNORECASE)
MAX_MENCIONES = 5


def notificar(destinatario, actor, tipo, registro=None, comentario=None):
    """Crea el aviso, salvo que sea sobre una acción de uno mismo."""
    if destinatario.id == actor.id:
        return None
    return Notificacion.objects.create(
        destinatario=destinatario,
        actor=actor,
        tipo=tipo,
        registro=registro,
        comentario=comentario,
    )


def usuarios_mencionados(texto):
    """Usuarios activos nombrados con @ en el texto (sin repetir, máximo 5)."""
    nombres = []
    for nombre in PATRON_MENCION.findall(texto or ''):
        nombre = nombre.lower().rstrip('.')
        if nombre not in nombres:
            nombres.append(nombre)
    if not nombres:
        return []
    return list(
        Usuario.objects.filter(username__in=nombres[:MAX_MENCIONES], auth__is_active=True)
    )


def notificar_comentario(comentario):
    """Avisa al dueño del entrenamiento y a quienes fueron mencionados (si pueden verlo)."""
    registro = comentario.registro
    autor = comentario.usuario
    avisados = {autor.id}

    if registro.usuario_id not in avisados:
        notificar(registro.usuario, autor, Notificacion.COMENTARIO, registro=registro, comentario=comentario)
        avisados.add(registro.usuario_id)

    for mencionado in usuarios_mencionados(comentario.texto):
        # No se avisa a quien no puede ver el entrenamiento (ej. cuenta privada que no sigue)
        if mencionado.id in avisados or not puede_interactuar(mencionado, registro):
            continue
        notificar(mencionado, autor, Notificacion.MENCION, registro=registro, comentario=comentario)
        avisados.add(mencionado.id)
