"""Genera los íconos de la app (favicon, iPhone, Android) desde public/icons/icono.svg.

Uso: python herramientas/iconos.py   (necesita: pip install resvg-py pillow)

icono.svg es el escudo solo, sin fondo: así sirve de favicon. Para los
íconos de la app se pone sobre un cuadro oscuro con un resplandor morado.
"""
import io
from pathlib import Path

import resvg_py
from PIL import Image

CARPETA = Path(__file__).resolve().parent.parent / 'frontend' / 'public' / 'icons'
svg = (CARPETA / 'icono.svg').read_text(encoding='utf-8')

# Lo de adentro del <svg>: definiciones y el escudo
interior = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]


def sobre_fondo(escala):
    """El escudo centrado sobre un cuadro oscuro; escala < 1 lo deja en la zona segura."""
    margen = 20 * (1 - escala)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="app-fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e1230"/><stop offset="1" stop-color="#07050b"/>
    </linearGradient>
    <radialGradient id="app-luz" cx="20" cy="22" r="18" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a855f7" stop-opacity="0.45"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="40" height="40" fill="url(#app-fondo)"/>
  <rect width="40" height="40" fill="url(#app-luz)"/>
  <g transform="translate({margen} {margen}) scale({escala})">{interior}</g>
</svg>'''


def guardar(texto, lado, nombre):
    png = bytes(resvg_py.svg_to_bytes(svg_string=texto, width=lado, height=lado))
    Image.open(io.BytesIO(png)).save(CARPETA / nombre, optimize=True)
    print(nombre, lado)


guardar(svg, 48, 'favicon-48.png')
guardar(sobre_fondo(0.8), 192, 'icono-192.png')
guardar(sobre_fondo(0.8), 512, 'icono-512.png')
guardar(sobre_fondo(0.78), 180, 'apple-touch-icon.png')
guardar(sobre_fondo(0.62), 512, 'icono-maskable-512.png')
