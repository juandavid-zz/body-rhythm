"""Segunda pasada: los que no quedaron en la primera.

Uso: python completar.py <catalogo_exdb.json> <faltan.json> <carpeta_gifs> <salida>

- Si en ExerciseDB hay un ejercicio igual (por nombre exacto), prueba todos los
  GIF con ese nombre hasta encontrar uno que exista.
- Los que no tienen un igual en ExerciseDB se quedan con sus fotos de RepDB.
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import hacer_videos as hv  # noqa: E402

# Ejercicio de la biblioteca -> nombre en ExerciseDB (mismo movimiento)
IGUALES = {
    'assisted-pull-ups': 'assisted pull-up',
    'battle-ropes': 'battling ropes',
    'cable-crunch': 'cable kneeling crunch',
    'cocoons': 'cocoons',
    'hanging-pike': 'hanging pike',
    'inverted-row': 'inverted row',
    'kneeling-cable-row': 'cable high row (kneeling)',
    'lunge': 'forward lunge',
    'romanian-deadlift': 'barbell romanian deadlift',
    'seated-smith-machine-shoulder-press': 'smith seated shoulder press',
    'smith-machine-bent-over-row': 'smith bent over row',
    'upright-row': 'barbell upright row',
    'v-bar-lat-pulldown': 'cable lateral pulldown with v-bar',
    'v-bar-tricep-pushdown': 'cable triceps pushdown (v-bar)',
    'db-reverse-curl': 'dumbbell standing reverse curl',
    'wide-grip-bench-press': 'barbell wide bench press',
    'hip-thrust': 'barbell glute bridge two-leg on bench',
    'stability-ball-knee-tuck': 'pull-in (on stability ball)',
    'ball-pike': 'exercise ball pike push up',
    'deficit-push-ups': 'deep push up',
    'one-arm-kettlebell-row': 'kettlebell single-arm row',
    'dumbbell-split-squat': 'dumbbell single leg split squat',
    'smith-machine-bulgarian-split': 'smith single leg split squat',
    'smith-machine-calf-raise': 'smith standing leg calf raise',
    'face-pull': 'cable rear delt row (with rope)',
    'banded-lateral-walk': 'monster walk',
    'negative-pull-ups': 'pull-up',
    'dumbbell-wrist-curl': 'dumbbell seated palms up wrist curl',
}


def main():
    catalogo = json.load(open(sys.argv[1], encoding='utf-8'))
    faltan = [s for s, _ in json.load(open(sys.argv[2], encoding='utf-8'))]
    gifs, salida = Path(sys.argv[3]), Path(sys.argv[4])
    por_nombre = {}
    for e in catalogo:
        por_nombre.setdefault(e['name'].lower(), []).append(e['exerciseId'])

    resto = []
    usados = {}
    for slug in faltan:
        nombre = IGUALES.get(slug)
        gif = None
        for exdb_id in por_nombre.get(nombre, []):
            gif = hv.bajar(exdb_id, gifs)
            if gif:
                usados[slug] = exdb_id
                break
        if not gif:
            resto.append(slug)
            continue
        frames = hv.cuadros_video(gif)
        hv.guardar_mp4(frames, salida / f'{slug}.mp4')
        frames[0].resize((360, 360), Image.LANCZOS).save(salida / f'{slug}.webp', quality=78, method=4)
        print('exercisedb', slug, flush=True)

    json.dump(usados, open(Path(__file__).parent / 'usados_segunda.json', 'w'), indent=1)
    print('sin animación (siguen con sus fotos):', len(resto))


if __name__ == '__main__':
    main()
