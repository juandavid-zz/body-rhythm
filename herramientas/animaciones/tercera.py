"""Tercera pasada: ejercicios importantes sin un igual exacto en ExerciseDB.

Uso: python tercera.py <catalogo_exdb.json> <carpeta_gifs> <salida>

Se usa la animación del mismo movimiento aunque cambie un poco el equipo
(por ejemplo, el curl con pesa rusa usa el curl con mancuerna). Los
ejercicios poco comunes (TRX, estiramientos con banda) siguen con sus fotos.
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import hacer_videos as hv  # noqa: E402

PARECIDOS = {
    # Core
    'plank': 'weighted front plank',
    'side-plank': 'side bridge',
    'toes-to-bar': 'hanging leg raise',
    'v-ups': 'jackknife sit-up',
    'captains-chair-knee-raise': 'captains chair straight-leg raise',
    # Piernas y glúteos
    'sumo-squat': 'smith sumo squat',
    'dumbbell-pistol-squat': 'single leg squat (pistol)',
    'kettlebell-bulgarian-split-squat': 'dumbbell single leg split squat',
    'kettlebell-goblet-lunge': 'dumbbell rear lunge',
    'kettlebell-reverse-lunge': 'dumbbell rear lunge',
    'dumbbell-hip-thrust': 'glute bridge two-leg on bench',
    'kettlebell-hip-thrust': 'glute bridge two-leg on bench',
    'banded-glute-bridge': 'low glute bridge on floor',
    'kettlebell-deadlift': 'dumbbell deadlift',
    'kettlebell-sumo-deadlift': 'barbell sumo deadlift',
    'kettlebell-single-leg-deadlift': 'dumbbell single leg deadlift',
    'one-arm-single-leg-kettlebell-romanian-deadlift': 'dumbbell single leg deadlift',
    'ez-bar-romanian-deadlift': 'barbell romanian deadlift',
    'banded-romanian-deadlift': 'band straight-leg deadlift',
    'banded-good-morning': 'barbell good morning',
    'bodyweight-good-morning': 'barbell good morning',
    # Pecho y hombros
    'push-press': 'dumbbell push press',
    'spoto-press': 'barbell bench press',
    'decline-bench-press-ez-bar': 'barbell decline bench press',
    'incline-bench-ez-bar-press': 'barbell incline bench press',
    'trx-chest-press': 'suspended push-up',
    'double-kettlebell-overhead-press': 'kettlebell two-arm military press',
    'ez-bar-upright-row': 'barbell upright row',
    'hang-clean': 'power clean',
    # Espalda
    'close-grip-pull-ups': 'chin-ups (narrow parallel grip)',
    'rings-inverted-row': 'inverted row',
    'trx-row': 'suspended row',
    'bent-over-ez-bar-row': 'barbell bent over row',
    'ez-bar-shrug': 'barbell shrug',
    'kettlebell-shrug': 'dumbbell shrug',
    'kettlebell-pullover': 'dumbbell pullover',
    # Brazos
    'kettlebell-hammer-curl': 'dumbbell hammer curl',
    'double-kettlebell-bicep-curl': 'dumbbell biceps curl',
    'one-arm-kettlebell-bicep-curl': 'dumbbell biceps curl',
    'one-arm-kettlebell-tricep-kickback': 'dumbbell kickback',
    'dumbbell-windmill': 'kettlebell windmill',
}


def main():
    catalogo = json.load(open(sys.argv[1], encoding='utf-8'))
    gifs, salida = Path(sys.argv[2]), Path(sys.argv[3])
    por_nombre = {}
    for e in catalogo:
        por_nombre.setdefault(e['name'].lower(), []).append(e['exerciseId'])
    usados = {}
    for slug, nombre in PARECIDOS.items():
        for exdb_id in por_nombre.get(nombre, []):
            gif = hv.bajar(exdb_id, gifs)
            if gif:
                frames = hv.cuadros_video(gif)
                hv.guardar_mp4(frames, salida / f'{slug}.mp4')
                frames[0].resize((360, 360), Image.LANCZOS).save(salida / f'{slug}.webp', quality=78, method=4)
                usados[slug] = exdb_id
                print('listo', slug, flush=True)
                break
        else:
            print('sin gif', slug, flush=True)
    json.dump(usados, open(Path(__file__).parent / 'usados_tercera.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
