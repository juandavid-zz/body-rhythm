"""Para los ejercicios que no están en ExerciseDB: usa las dos fotos de RepDB
(inicio y final), las deja en blanco y gris como un GIF de ExerciseDB y las
pasa por el mismo estilo.

Uso: python desde_repdb.py <carpeta_fotos> <salida> slug [slug ...]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import estilizar_gifs as e  # noqa: E402
import hacer_videos as hv  # noqa: E402


def a_dibujo(ruta):
    """Foto de RepDB -> dibujo gris sobre blanco, de 180 px como los GIF."""
    img = Image.open(ruta).convert('RGB')
    a = np.asarray(img, dtype=np.int16)
    # El fondo es un color liso: todo lo parecido a la esquina se vuelve blanco
    # Mediana de las cuatro esquinas: aunque una tenga un objeto (el anclaje del TRX),
    # las otras tres mandan
    esquinas = [a[:8, :8], a[:8, -8:], a[-8:, :8], a[-8:, -8:]]
    fondo = np.median(np.concatenate([e.reshape(-1, 3) for e in esquinas]), axis=0)
    cerca = np.abs(a - fondo).sum(-1) < 60
    # Solo el fondo conectado al borde (no la ropa del mismo tono)
    etiquetas, _ = ndimage.label(cerca)
    borde = np.unique(np.concatenate([etiquetas[0], etiquetas[-1], etiquetas[:, 0], etiquetas[:, -1]]))
    es_fondo = np.isin(etiquetas, borde[borde > 0])
    # Zonas grandes del color del fondo encerradas por el cuerpo y la sombra del piso
    # (entre las piernas, entre brazo y torso) también son fondo
    tam_cerca = np.bincount(etiquetas.ravel())
    tam_cerca[0] = 0
    es_fondo |= tam_cerca[etiquetas] > cerca.size * 0.004
    # Puntitos sueltos dentro del fondo (ruido de la compresión) también son fondo
    figura, _ = ndimage.label(~es_fondo)
    tamanos = np.bincount(figura.ravel())
    es_fondo |= (tamanos[figura] < 400) & (figura > 0)
    gris = np.asarray(ImageOps.grayscale(img), dtype=np.float32)
    # Rellenos claros y bordes oscuros, como el dibujo de ExerciseDB
    gris = 255 - (255 - gris) * 0.55
    gris[es_fondo] = 255
    out = Image.fromarray(np.clip(gris, 0, 255).astype(np.uint8), 'L').convert('RGB')
    out = out.filter(ImageFilter.SMOOTH)
    return out.resize((180, 180), Image.LANCZOS)


def main():
    fotos, salida = Path(sys.argv[1]), Path(sys.argv[2])
    for slug in sys.argv[3:]:
        ini, fin = fotos / f'{slug}-start.webp', fotos / f'{slug}-peak.webp'
        if not ini.exists():
            ini = fotos / f'{slug}-main.webp'  # ejercicios quietos: una sola foto
        if not ini.exists():
            print('sin fotos', slug)
            continue
        a = e.procesar(a_dibujo(ini))
        b = e.procesar(a_dibujo(fin)) if fin.exists() else a
        frames = []
        for img, ms in e.animar(a, b):
            fondo = hv.FONDO.copy()
            fondo.alpha_composite(img)
            frames += [fondo.convert('RGB')] * max(1, round(ms * hv.FPS / 1000))
        hv.guardar_mp4(frames, salida / f'{slug}.mp4')
        frames[0].resize((360, 360), Image.LANCZOS).save(salida / f'{slug}.webp', quality=78, method=4)
        print('listo', slug)


if __name__ == '__main__':
    main()
