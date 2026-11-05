"""Pasa los GIF de ExerciseDB al estilo de Body Rhythm.

Uso: python estilizar_gifs.py <carpeta_gifs> <carpeta_salida>

Cada GIF de ExerciseDB tiene dos posturas (cuadros 0 y 6) y en medio
fundidos entre ellas. Se toman solo las dos posturas limpias, se estilizan
(cuerpo opaco, líneas claras, músculos en degradado, sin fondo) y se arma
una transición nueva más suave. Sale en WebP animado con transparencia.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ESCALA = 3  # 180 px -> 540 px
EQUIPO_OSCURO = np.array([76, 29, 149], dtype=np.float32)
EQUIPO_CLARO = np.array([200, 150, 255], dtype=np.float32)
LILA = np.array([240, 234, 255], dtype=np.float32)
CUERPO = np.array([58, 44, 100], dtype=np.float32)
BORDE = np.array([226, 206, 255], dtype=np.float32)
MORADO = np.array([168, 85, 247], dtype=np.float32)
ROSA = np.array([236, 72, 153], dtype=np.float32)

QUIETO_MS = 900      # tiempo en cada postura
CAMBIO_MS = 360      # duración de la transición (corta, para que no se vea doble)
PASOS = 8            # cuadros de la transición


def posturas(ruta):
    im = Image.open(ruta)
    salida = []
    for n in (0, 6):
        im.seek(n)
        salida.append(im.convert('RGB'))
    return salida


def silueta(luz):
    """Máscara del cuerpo entero (sin huecos) y su contorno."""
    cuerpo = Image.fromarray(((luz < 246) * 255).astype(np.uint8), 'L')
    # Cierra los cortes finos entre líneas del dibujo
    cuerpo = cuerpo.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    # Rellena los huecos: todo lo que no se alcanza desde el borde es cuerpo
    fuera = cuerpo.copy()
    ImageDraw.floodfill(fuera, (0, 0), 128)
    lleno = np.where(np.asarray(fuera) == 128, 0, 255).astype(np.uint8)
    lleno_img = Image.fromarray(lleno, 'L').filter(ImageFilter.GaussianBlur(1.0))
    gordo = lleno_img.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.4))
    dentro = np.asarray(lleno_img, dtype=np.float32) / 255
    contorno = np.clip(np.asarray(gordo, dtype=np.float32) / 255 - dentro, 0, 1)
    return dentro, contorno


def equipo(luz, sat):
    """Máscara de las pesas: manchas oscuras, grises y grandes (las líneas finas del cuerpo no pasan)."""
    oscuro = (luz < 150) & (sat < 25 / 255)
    manchas = ndimage.binary_opening(oscuro, structure=np.ones((11, 11)))
    etiquetas, _ = ndimage.label(manchas)
    tamanos = np.bincount(etiquetas.ravel())
    tamanos[0] = 0
    grandes = tamanos[etiquetas] >= 1500
    # Un poco más ancha para cubrir el canto de cada disco
    grandes = ndimage.binary_dilation(grandes, iterations=4) & (luz < 215)
    m = Image.fromarray((grandes * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(1.0))
    return np.asarray(m, dtype=np.float32) / 255


def encima(color_a, alfa_a, color_b, alfa_b):
    """Pone la capa a encima de la b (alfa normal)."""
    alfa = alfa_a + alfa_b * (1 - alfa_a)
    color = (color_a * alfa_a[..., None] + color_b * (alfa_b * (1 - alfa_a))[..., None]) / np.maximum(alfa, 1e-4)[..., None]
    return color, alfa


def procesar(rgb):
    # Agrandar primero (y enfocar un poco) para que líneas y borde salgan finos
    rgb = rgb.resize((rgb.width * ESCALA, rgb.height * ESCALA), Image.LANCZOS)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2))
    a = np.asarray(rgb, dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    luz = 0.299 * r + 0.587 * g + 0.114 * b
    sat = (a.max(-1) - a.min(-1)) / 255.0
    rojo = np.clip((r - (g + b) / 2 - 18) / 70, 0, 1) * (sat > 0.12)

    # Dibujo: las líneas oscuras pasan a lila claro, como luz sobre el cuerpo
    alfa_linea = np.clip((248 - luz) / 110, 0, 1)
    claridad = np.clip(0.5 + (1 - luz / 255) * 0.8, 0, 1)[..., None]
    linea = LILA * claridad

    # Músculos: degradado de morado (arriba) a rosa (abajo)
    t = np.linspace(0, 1, a.shape[0], dtype=np.float32)[:, None, None]
    musculo = np.minimum((MORADO * (1 - t) + ROSA * t) * 1.25, 255)
    m = rojo[..., None]
    linea = linea * (1 - m) + musculo * m
    alfa_linea = np.maximum(alfa_linea, rojo)

    # Cuerpo opaco debajo del dibujo y borde claro alrededor
    dentro, contorno = silueta(luz)
    color, alfa = encima(linea, alfa_linea, np.broadcast_to(CUERPO, a.shape), dentro)
    color, alfa = encima(np.broadcast_to(BORDE, a.shape), np.clip(contorno * 1.3, 0, 1), color, alfa)

    # Pesas y máquinas: zonas grandes y oscuras sin color, pintadas de morado
    eq = equipo(luz, sat)
    sombra = np.clip(luz / 130, 0, 1)[..., None]
    morado = EQUIPO_OSCURO * (1 - sombra) + EQUIPO_CLARO * sombra
    color = color * (1 - eq[..., None]) + morado * eq[..., None]
    alfa = np.maximum(alfa, eq)

    out = np.dstack([np.clip(color, 0, 255), alfa * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def animar(a, b):
    """Postura a, transición suave, postura b, transición de vuelta."""
    frames = [(a, QUIETO_MS)]
    paso = CAMBIO_MS // PASOS
    for origen, destino in ((a, b), (b, a)):
        for i in range(1, PASOS):
            x = i / PASOS
            x = x * x * (3 - 2 * x)  # entra y sale despacio
            frames.append((Image.blend(origen, destino, x), paso))
        if destino is b:
            frames.append((b, QUIETO_MS))
    return frames


def main():
    origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    for gif in sorted(origen.glob('*.gif')):
        a, b = (procesar(p) for p in posturas(gif))
        frames = animar(a, b)
        imgs = [f for f, _ in frames]
        imgs[0].save(
            destino / f'{gif.stem}-holo.webp',
            save_all=True,
            append_images=imgs[1:],
            duration=[d for _, d in frames],
            loop=0,
            quality=90,
            method=4,
        )
        print(gif.stem, len(frames), 'cuadros')


if __name__ == '__main__':
    main()
