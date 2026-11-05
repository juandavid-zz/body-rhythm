"""Genera los íconos de la app (favicon, iPhone, Android) desde public/icons/icono.svg.

Uso: python herramientas/iconos.py   (necesita: pip install resvg-py pillow)
"""
import io
import re
from pathlib import Path

import resvg_py
from PIL import Image

CARPETA = Path(__file__).resolve().parent.parent / 'frontend' / 'public' / 'icons'
svg = (CARPETA / 'icono.svg').read_text(encoding='utf-8')


def a_sangre(texto, escala_letra):
    """Sin esquinas transparentes ni borde: iPhone y Android recortan el ícono ellos mismos.
    escala_letra < 1 deja la "B." dentro de la zona segura del ícono "maskable"."""
    # Las capas de fondo (degradado, luces y sombra) pasan a cubrir todo el cuadro
    texto = texto.replace('<rect x="1" y="1" width="38" height="38" rx="11" ', '<rect width="40" height="40" ')
    texto = re.sub(r'\s*<rect x="1\.4"[^>]*stroke="url\(#borde\)"[^>]*/>', '', texto)
    # La letra y el punto van juntos, para escalarlos desde el centro
    texto = texto.replace('<g filter="url(#relieve)">', f'<g transform="translate(20 20) scale({escala_letra}) translate(-20 -20)"><g filter="url(#relieve)">')
    return texto.replace('fill="url(#chispa)"/>', 'fill="url(#chispa)"/></g>')


def guardar(texto, lado, nombre):
    png = bytes(resvg_py.svg_to_bytes(svg_string=texto, width=lado, height=lado))
    Image.open(io.BytesIO(png)).save(CARPETA / nombre, optimize=True)
    print(nombre, lado)


guardar(svg, 48, 'favicon-48.png')
guardar(svg, 192, 'icono-192.png')
guardar(svg, 512, 'icono-512.png')
guardar(a_sangre(svg, 1), 180, 'apple-touch-icon.png')
guardar(a_sangre(svg, 0.78), 512, 'icono-maskable-512.png')
