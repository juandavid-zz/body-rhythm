"""
Almacenamiento de archivos en la base de datos (modelo ArchivoGuardado).

Sirve para las fotos de perfil en servidores cuyo disco no dura, como Render
gratis, sin depender de un servicio externo. Las fotos se sirven desde
/media/<nombre> (body_rhythm_api/urls.py).
"""
import mimetypes
import os
import secrets

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import Http404, HttpResponse
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class AlmacenBaseDatos(Storage):
    def _modelo(self):
        from .models import ArchivoGuardado  # aquí para no importar modelos al cargar settings
        return ArchivoGuardado

    def _open(self, name, mode='rb'):
        archivo = self._modelo().objects.get(nombre=name)
        return ContentFile(bytes(archivo.contenido), name=name)

    def _save(self, name, content):
        name = name.replace('\\', '/')
        content.seek(0)
        datos = content.read()
        tipo = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        self._modelo().objects.update_or_create(nombre=name, defaults={'contenido': datos, 'tipo': tipo})
        return name

    def get_available_name(self, name, max_length=None):
        name = name.replace('\\', '/')
        raiz, extension = os.path.splitext(name)
        while self.exists(name):
            name = f'{raiz}_{secrets.token_hex(3)}{extension}'
        return name[:max_length] if max_length else name

    def exists(self, name):
        return self._modelo().objects.filter(nombre=name).exists()

    def delete(self, name):
        self._modelo().objects.filter(nombre=name).delete()

    def size(self, name):
        archivo = self._modelo().objects.filter(nombre=name).only('contenido').first()
        return len(archivo.contenido) if archivo else 0

    def url(self, name):
        return f'{settings.MEDIA_URL}{name}'


def servir_archivo(request, nombre):
    """Entrega un archivo guardado en la base. El nombre nunca se repite, así que se puede guardar en caché."""
    from .models import ArchivoGuardado

    archivo = ArchivoGuardado.objects.filter(nombre=nombre).first()
    if archivo is None:
        raise Http404('No existe ese archivo')
    respuesta = HttpResponse(bytes(archivo.contenido), content_type=archivo.tipo)
    respuesta['Cache-Control'] = 'public, max-age=31536000, immutable'
    return respuesta
