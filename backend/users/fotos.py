"""Procesar la foto de perfil: validarla, recortarla en cuadrado y guardarla liviana."""

import io
import secrets

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 5 * 1024 * 1024        # 5 MB como máximo al subir
LADO = 400                          # se guarda en 400 x 400 px (nítida en pantallas retina)
FORMATOS = {'JPEG', 'PNG', 'WEBP', 'GIF', 'MPO'}  # MPO: fotos de algunos celulares


class FotoInvalida(Exception):
    pass


def procesar_foto(archivo):
    """
    Devuelve la foto lista para guardar (ContentFile WebP de 400x400).
    Gira la imagen según su EXIF y la recorta al centro. Al guardarla de nuevo
    se pierden los metadatos, incluida la ubicación GPS que traen muchas fotos.
    """
    if archivo.size > MAX_BYTES:
        raise FotoInvalida('La foto pesa más de 5 MB. Elige una más liviana.')

    try:
        imagen = Image.open(archivo)
        formato = imagen.format
        imagen.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise FotoInvalida('El archivo no es una imagen válida.')

    if formato not in FORMATOS:
        raise FotoInvalida('Usa una foto JPG, PNG o WebP.')

    imagen = ImageOps.exif_transpose(imagen).convert('RGB')
    imagen = ImageOps.fit(imagen, (LADO, LADO), Image.LANCZOS)

    salida = io.BytesIO()
    imagen.save(salida, 'WEBP', quality=85, method=6)
    return ContentFile(salida.getvalue(), name=f'{secrets.token_hex(8)}.webp')


def borrar_foto(usuario):
    """Quita la foto del usuario y borra el archivo del disco."""
    if usuario.foto:
        usuario.foto.delete(save=False)
        usuario.foto = None


def url_foto(usuario):
    """Ruta pública de la foto (ej. /media/fotos_perfil/abc.webp) o None si no tiene."""
    return usuario.foto.url if usuario.foto else None
