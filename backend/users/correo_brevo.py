"""
Envío de correos por la API web de Brevo (antes Sendinblue), sin SMTP.

Render gratis bloquea los puertos de SMTP (25, 465 y 587), así que Gmail por
SMTP no sirve ahí. Brevo manda por HTTPS (puerto 443) y en su plan gratis
permite 300 correos al día desde un remitente verificado (puede ser un Gmail).

Se activa sola con BREVO_API_KEY en el .env; DEFAULT_FROM_EMAIL debe ser el
remitente verificado en Brevo.
"""
import logging
from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

URL_BREVO = 'https://api.brevo.com/v3/smtp/email'


def _contacto(direccion):
    nombre, correo = parseaddr(direccion)
    return {'email': correo, **({'name': nombre} if nombre else {})}


class CorreoBrevo(BaseEmailBackend):
    def send_messages(self, mensajes):
        enviados = 0
        for mensaje in mensajes:
            html = next((contenido for contenido, tipo in getattr(mensaje, 'alternatives', []) if tipo == 'text/html'), None)
            datos = {
                'sender': _contacto(mensaje.from_email or settings.DEFAULT_FROM_EMAIL),
                'to': [_contacto(d) for d in mensaje.to],
                'subject': mensaje.subject,
                'textContent': mensaje.body or ' ',
            }
            if html:
                datos['htmlContent'] = html
            if mensaje.reply_to:
                datos['replyTo'] = _contacto(mensaje.reply_to[0])
            try:
                r = requests.post(
                    URL_BREVO,
                    json=datos,
                    headers={'api-key': settings.BREVO_API_KEY, 'accept': 'application/json'},
                    timeout=settings.EMAIL_TIMEOUT,
                )
                r.raise_for_status()
                enviados += 1
            except requests.RequestException as e:
                detalle = getattr(getattr(e, 'response', None), 'text', '')[:300]
                logger.error('Brevo no envió el correo a %s: %s %s', mensaje.to, e, detalle)
                if not self.fail_silently:
                    raise
        return enviados
