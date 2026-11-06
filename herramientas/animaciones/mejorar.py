"""Versión en alta calidad de las animaciones: más nítidas y con movimiento real.

Uso: python mejorar.py <emparejados.json> <desde_repdb.txt> <carpeta_gifs> <carpeta_fotos>
                       <carpeta_salida> <carpeta_ia> <carpeta_trabajo> [slug ...]

1. Cada postura (la de inicio y la final) se agranda con Real-ESRGAN, un modelo
   hecho para dibujos animados: de 180 px a 720 px sin bordes borrosos.
2. Se le pone el estilo de Body Rhythm a 720 px.
3. RIFE dibuja los cuadros intermedios entre las dos posturas, así el cuerpo se
   mueve de verdad en vez de fundirse de una postura a la otra.
4. Se arma el video a 30 cuadros por segundo con entrada y salida suaves.

<carpeta_ia> debe tener realesrgan-ncnn-vulkan.exe (con su carpeta models) y
rife-ncnn-vulkan.exe (con rife-v4.6) en cualquier subcarpeta. Corren en la
tarjeta de video (Vulkan).
Sin slugs hace todos los ejercicios de los dos listados.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import desde_repdb as rd  # noqa: E402
import estilizar_gifs as e  # noqa: E402
import hacer_videos as hv  # noqa: E402

LADO = 720
FPS = 30
QUIETO = 0.75     # segundos en cada postura
CAMBIO = 0.7      # segundos que tarda en ir de una postura a la otra
INTERMEDIOS = 33  # cuadros que dibuja RIFE de una postura a la otra (incluye las dos)
FONDO = hv.escenario(LADO)


def buscar(carpeta, nombre):
    return next(Path(carpeta).rglob(nombre))


def correr(cmd):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f'{cmd[0]} falló: {r.stderr[-400:]}')


def agrandar(ia, entrada, salida, veces):
    """Real-ESRGAN sobre toda una carpeta de PNG."""
    exe = buscar(ia, 'realesrgan-ncnn-vulkan.exe')
    salida.mkdir(parents=True, exist_ok=True)
    correr([exe, '-i', entrada, '-o', salida, '-n', f'realesr-animevideov3-x{veces}', '-s', veces,
            '-m', exe.parent / 'models', '-f', 'png'])


def intermedios(ia, carpeta, salida):
    """RIFE: de las dos posturas (0.png y 1.png) saca INTERMEDIOS cuadros."""
    exe = buscar(ia, 'rife-ncnn-vulkan.exe')
    if salida.exists():
        shutil.rmtree(salida)
    salida.mkdir(parents=True)
    # Con dos imágenes de entrada, RIFE reparte los cuadros como si hubiera una tercera:
    # la segunda mitad sale igual a la postura final. Se piden el doble y se quitan esos.
    correr([exe, '-i', carpeta, '-o', salida, '-n', INTERMEDIOS * 2, '-m', exe.parent / 'rife-v4.6',
            '-x', '-z', '-f', '%03d.png'])
    cuadros = [Image.open(p).convert('RGB') for p in sorted(salida.glob('*.png'))]
    final = np.asarray(cuadros[-1].resize((180, 180)), np.float32)
    for i, c in enumerate(cuadros):
        if np.abs(np.asarray(c.resize((180, 180)), np.float32) - final).mean() < 0.05:
            return cuadros[:i + 1]
    return cuadros


def suave(x):
    return x * x * (3 - 2 * x)


def linea_de_tiempo(cuadros):
    """Quieto en la postura 1, va a la 2 con entrada y salida suaves, quieto, y vuelve."""
    quieto = round(QUIETO * FPS)
    cambio = round(CAMBIO * FPS)
    ida = [cuadros[round(suave(i / cambio) * (len(cuadros) - 1))] for i in range(1, cambio)]
    return [cuadros[0]] * quieto + ida + [cuadros[-1]] * quieto + ida[::-1]


def sobre_fondo(rgba):
    fondo = FONDO.copy()
    fondo.alpha_composite(rgba)
    return fondo.convert('RGB')


def main():
    pares = {p['slug']: p['exdb_id'] for p in json.load(open(sys.argv[1], encoding='utf-8'))}
    repdb = [s.strip() for s in open(sys.argv[2], encoding='utf-8') if s.strip()]
    gifs, fotos, salida, ia, trabajo = (Path(a) for a in sys.argv[3:8])
    slugs = sys.argv[8:] or list(pares) + repdb
    salida.mkdir(parents=True, exist_ok=True)
    # Si se cortó a la mitad, sigue con los que faltan
    slugs = [s for s in slugs if not ((salida / f'{s}.mp4').exists() and (salida / f'{s}.webp').exists())]
    print('faltan', len(slugs), flush=True)

    # 1. Posturas crudas: las de ExerciseDB (180 px) se agrandan x4 y las de RepDB (360 px) x2
    crudo4, crudo2 = trabajo / 'crudo4', trabajo / 'crudo2'
    for c in (crudo4, crudo2):
        shutil.rmtree(c, ignore_errors=True)
        c.mkdir(parents=True)
    quietos = set()
    for slug in slugs:
        if slug in pares:
            gif = gifs / f'{pares[slug]}.gif'
            for n, img in enumerate(e.posturas(gif)):
                img.save(crudo4 / f'{slug}__{n}.png')
        else:
            ini, fin = fotos / f'{slug}-start.webp', fotos / f'{slug}-peak.webp'
            if not ini.exists():
                ini = fotos / f'{slug}-main.webp'
            if not fin.exists():
                fin = ini
                quietos.add(slug)
            for n, ruta in enumerate((ini, fin)):
                rd.a_dibujo(ruta, 360).save(crudo2 / f'{slug}__{n}.png')
    grande = trabajo / 'grande'
    shutil.rmtree(grande, ignore_errors=True)
    agrandar(ia, crudo4, grande, 4)
    agrandar(ia, crudo2, grande, 4 // 2)
    print('agrandados', len(list(grande.glob('*.png'))), flush=True)

    # 2 y 3. Estilo a 720 px y cuadros intermedios
    for i, slug in enumerate(slugs, 1):
        posturas = trabajo / 'posturas' / slug
        posturas.mkdir(parents=True, exist_ok=True)
        for n in (0, 1):
            img = Image.open(grande / f'{slug}__{n}.png').convert('RGB')
            sobre_fondo(e.procesar(img, LADO)).save(posturas / f'{n}.png')
        if slug in quietos:
            cuadros = [Image.open(posturas / '0.png').convert('RGB')]
        else:
            cuadros = intermedios(ia, posturas, trabajo / 'rife' / slug)

        # 4. Video y póster
        hv.guardar_mp4(linea_de_tiempo(cuadros), salida / f'{slug}.mp4', fps=FPS, crf=26)
        cuadros[0].resize((480, 480), Image.LANCZOS).save(salida / f'{slug}.webp', quality=80, method=4)
        # Los cuadros de RIFE pesan varios MB por ejercicio: se borran apenas se usan
        shutil.rmtree(trabajo / "rife" / slug, ignore_errors=True)
        print(i, slug, flush=True)


if __name__ == '__main__':
    main()
