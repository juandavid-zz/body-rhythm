"""Envío del correo de verificación de cuenta (Gmail / SMTP)."""
import logging
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

# Horas que dura válido el enlace (y el código) del correo
HORAS_VALIDEZ = 24
# Intentos con un mismo código antes de tener que pedir uno nuevo
MAX_INTENTOS_CODIGO = 5
# Espera mínima entre reenvíos del correo
SEGUNDOS_ENTRE_REENVIOS = 60
logger = logging.getLogger(__name__)


def generar_token(auth):
    """Crea un token nuevo (y su código de 6 dígitos) y lo guarda."""
    auth.token = secrets.token_urlsafe(32)
    auth.codigo_verificacion = f'{secrets.randbelow(1000000):06d}'
    auth.token_expira = timezone.now() + timedelta(hours=HORAS_VALIDEZ)
    auth.intentos_codigo = 0
    auth.save(update_fields=['token', 'codigo_verificacion', 'token_expira', 'intentos_codigo'])
    return auth.token


def segundos_para_reenviar(auth):
    """Cuántos segundos faltan para poder pedir otro correo (0 si ya se puede)."""
    if not auth.token_expira:
        return 0
    enviado_en = auth.token_expira - timedelta(hours=HORAS_VALIDEZ)
    transcurrido = (timezone.now() - enviado_en).total_seconds()
    return max(0, math.ceil(SEGUNDOS_ENTRE_REENVIOS - transcurrido))


def token_vigente(auth):
    return bool(auth.token_expira and auth.token_expira > timezone.now())


def correo_configurado():
    """False si no hay credenciales SMTP en el .env y los correos solo se imprimen en consola."""
    return settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'


def enlace_verificacion(auth):
    return f"{settings.FRONTEND_URL.rstrip('/')}/verificar/{auth.token}"


def datos_envio(auth, enviado):
    """
    Respuesta para el frontend sobre el envío. Con MOSTRAR_ENLACE_VERIFICACION
    (solo desarrollo, sin SMTP) se incluye el enlace para verificar sin correo.
    """
    datos = {'correo_enviado': enviado and correo_configurado()}
    if settings.MOSTRAR_ENLACE_VERIFICACION and not correo_configurado():
        datos['enlace_desarrollo'] = enlace_verificacion(auth)
    return datos


def enviar_correo_verificacion(auth, nombre=''):
    """Genera el token y manda el correo. Devuelve True si salió."""
    generar_token(auth)
    enlace = enlace_verificacion(auth)

    if not correo_configurado():
        logger.warning(
            'Correo SMTP sin configurar (faltan EMAIL_HOST_USER/EMAIL_HOST_PASSWORD en .env): '
            'el correo de verificación solo se imprime en esta consola.'
        )

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
