"""Baja los GIF emparejados, los estiliza y los guarda como MP4 + póster.

Uso: python hacer_videos.py <emparejados.json> <carpeta_gifs> <carpeta_salida> [umbral]

El fondo (escenario morado) va dentro del video, así pesa ~10 veces menos
que un WebP con transparencia y se reproduce en cualquier navegador.
"""
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import estilizar_gifs as e  # noqa: E402

FPS = 25
LADO = 540


def escenario():
    y, x = np.mgrid[0:LADO, 0:LADO].astype(np.float32) / LADO
    base = np.array([13, 10, 24], dtype=np.float32)
    img = np.broadcast_to(base, (LADO, LADO, 3)).copy()

    def mancha(cx, cy, radio, color, fuerza):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / radio
        a = np.clip(1 - d, 0, 1) ** 1.6 * fuerza
        return a[..., None] * (np.array(color, dtype=np.float32) - img)

    img += mancha(0.5, 0.62, 0.62, (168, 85, 247), 0.42)
    img += mancha(0.5, 1.0, 0.5, (236, 72, 153), 0.2)
    # Piso: una elipse suave bajo los pies
    d = np.sqrt(((x - 0.5) / 0.32) ** 2 + ((y - 0.93) / 0.025) ** 2)
    a = np.clip(1 - d, 0, 1) * 0.45
    img += a[..., None] * (np.array([192, 132, 252], dtype=np.float32) - img)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


FONDO = escenario()


def bajar(exdb_id, carpeta):
    ruta = carpeta / f'{exdb_id}.gif'
    if ruta.exists() and ruta.stat().st_size > 1000:
        return ruta
    url = f'https://static.exercisedb.dev/media/{exdb_id}.gif'
    for intento in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'body-rhythm'})
            with urllib.request.urlopen(req, timeout=30) as r:
                ruta.write_bytes(r.read())
            return ruta
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None
            time.sleep(4 * (intento + 1))
    return None


def cuadros_video(gif):
    a, b = (e.procesar(p) for p in e.posturas(gif))
    frames = []
    for img, ms in e.animar(a, b):
        fondo = FONDO.copy()
        fondo.alpha_composite(img)
        frames += [fondo.convert('RGB')] * max(1, round(ms * FPS / 1000))
    return frames


def guardar_mp4(frames, ruta):
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{LADO}x{LADO}', '-r', str(FPS), '-i', '-',
        '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow',
        '-movflags', '+faststart', str(ruta),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in frames:
        proc.stdin.write(f.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError(f'ffmpeg falló con {ruta}')


def main():
    pares = json.load(open(sys.argv[1], encoding='utf-8'))
    gifs, salida = Path(sys.argv[2]), Path(sys.argv[3])
    umbral = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
    gifs.mkdir(parents=True, exist_ok=True)
    salida.mkdir(parents=True, exist_ok=True)
    hechos, fallidos = [], []
    for p in pares:
        if p['puntaje'] < umbral:
            continue
        mp4 = salida / f"{p['slug']}.mp4"
        poster = salida / f"{p['slug']}.webp"
        if mp4.exists() and poster.exists():
            hechos.append(p['slug'])
            continue
        gif = bajar(p['exdb_id'], gifs)
        if not gif:
            fallidos.append(p['slug'])
            print('sin gif', p['slug'], flush=True)
            continue
        frames = cuadros_video(gif)
        guardar_mp4(frames, mp4)
        frames[0].resize((360, 360), Image.LANCZOS).save(poster, quality=78, method=4)
        hechos.append(p['slug'])
        print(len(hechos), p['slug'], flush=True)
    print('listos', len(hechos), 'fallidos', len(fallidos), fallidos)


if __name__ == '__main__':
    main()
