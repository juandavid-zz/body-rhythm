"""Envío del correo de verificación de cuenta (Gmail / SMTP)."""
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

# Horas que dura válido el enlace del correo
HORAS_VALIDEZ = 24
logger = logging.getLogger(__name__)


def generar_token(auth):
    """Crea un token nuevo (y su código de 6 dígitos) y lo guarda."""
    auth.token = secrets.token_urlsafe(32)
    auth.codigo_verificacion = f'{secrets.randbelow(1000000):06d}'
    auth.token_expira = timezone.now() + timedelta(hours=HORAS_VALIDEZ)
    auth.save(update_fields=['token', 'codigo_verificacion', 'token_expira'])
    return auth.token


def token_vigente(auth):
    return bool(auth.token_expira and auth.token_expira > timezone.now())


def enviar_correo_verificacion(auth, nombre=''):
    """Genera el token y manda el correo. Devuelve True si salió."""
    token = generar_token(auth)
    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/verificar/{token}"

    contexto = {
        'nombre': nombre or auth.email.split('@')[0],
        'enlace': enlace,
        'codigo': auth.codigo_verificacion,
        'horas': HORAS_VALIDEZ,
    }

    asunto = 'Confirma tu cuenta en Body Rhythm'
    cuerpo_texto = (
        f"Hola {contexto['nombre']}:\n\n"
        f"Gracias por registrarte en Body Rhythm. Para activar tu cuenta abre este enlace:\n\n"
        f"{enlace}\n\n"
        f"Tu código de verificación es: {auth.codigo_verificacion}\n"
        f"El enlace vence en {HORAS_VALIDEZ} horas.\n\n"
        f"Si no creaste esta cuenta, ignora este mensaje."
    )

    mensaje = EmailMultiAlternatives(
        subject=asunto,
        body=cuerpo_texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[auth.email],
    )
    try:
        mensaje.attach_alternative(
            render_to_string('emails/verificacion.html', contexto), 'text/html'
        )
    except Exception:
        pass  # Si falta la plantilla, se manda solo en texto plano.

    try:
        enviados = mensaje.send(fail_silently=False)
        return bool(enviados)
    except Exception:
        logger.exception('No se pudo enviar el correo de verificación a %s', auth.email)
        return False
