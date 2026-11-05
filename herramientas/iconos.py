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


def a_sangre(texto, escala_onda):
    """Sin esquinas transparentes: iPhone y Android recortan el ícono ellos mismos.
    escala_onda < 1 deja la onda dentro de la zona segura del ícono "maskable"."""
    texto = re.sub(r'<path d="M20 1\.5c9\.6[^"]*s0 14\.4[^"]*" fill="url\(#fondo\)"/>',
                   '<rect width="40" height="40" fill="url(#fondo)"/>', texto)
    texto = re.sub(r'<path d="M20 1\.5c9\.6 0 14\.4 0 16\.5 2\.1S38\.5 10\.4 38\.5 20H1\.5[^"]*" fill="url\(#brillo\)"/>',
                   '<rect width="40" height="22" fill="url(#brillo)"/>', texto)
    return texto.replace('<path d="M7 20h2',
                         f'<path transform="translate(20 20) scale({escala_onda}) translate(-20 -20)" d="M7 20h2')


def guardar(texto, lado, nombre):
    png = bytes(resvg_py.svg_to_bytes(svg_string=texto, width=lado, height=lado))
    Image.open(io.BytesIO(png)).save(CARPETA / nombre, optimize=True)
    print(nombre, lado)


guardar(svg, 48, 'favicon-48.png')
guardar(svg, 192, 'icono-192.png')
guardar(svg, 512, 'icono-512.png')
guardar(a_sangre(svg, 1), 180, 'apple-touch-icon.png')
guardar(a_sangre(svg, 0.78), 512, 'icono-maskable-512.png')
