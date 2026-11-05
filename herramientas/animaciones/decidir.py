"""Aplica la revisión a mano sobre pares.json y deja la lista final.

Uso: python decidir.py <pares.json> <salida.json>
"""
import json
import sys

# Emparejados mal por nombre: muestran otro ejercicio
RECHAZOS = set('''
wide-grip-bench-press db-reverse-curl dumbbell-wrist-curl hanging-knee-raise hip-abduction leg-extension
squat cable-crunch hip-adduction dumbbell-split-squat leg-press barbell-row kettlebell-swing-clean
dumbbell-pistol-squat clean clean-and-jerk snatch crunches smith-machine-calf-raise side-plank wall-sit
dips double-kettlebell-overhead-press one-arm-kettlebell-row sumo-squat superman push-press pause-squat
kettlebell-lunge-press dumbbell-floor-press spoto-press bulgarian-split-squat captains-chair-knee-raise
kettlebell-goblet-lunge dumbbell-bench-pull landmine-press bench-pull bench-chest-stretch ball-pike
inverted-row bench-calf-stretch bench-lat-stretch split-jerk bodyweight-lateral-raise
banded-standing-hip-abduction trx-pistol-squat trx-chest-press bodyweight-good-morning band-pull-apart
plank face-pull negative-pull-ups dragon-flag kettlebell-close-grip-floor-press close-grip-pull-ups
muscle-snatch one-arm-kettlebell-floor-glute-bridge-press bodyweight-overhead-press one-arm-landmine-press
banded-rear-delt-stretch banded-romanian-deadlift ball-leg-curl kettlebell-sumo-deadlift banded-glute-bridge
banded-good-morning banded-calf-stretch heel-elevated-squat kettlebell-bulgarian-split-squat hang-clean
t-bar-row banded-standing-curl kettlebell-reverse-lunge isometric-neck-side double-kettlebell-dead-split-snatch
double-kettlebell-swing-snatch
'''.split())

# Por debajo del umbral pero bien emparejados
ACEPTAR = set('''
battle-ropes banded-kneeling-hip-thrust one-arm-kettlebell-bottoms-up-press ab-wheel-rollout glute-kickback
chest-supported-db-row kettlebell-russian-twist kettlebell-farmers-walk ez-bar-pullover bent-arm-ez-bar-pullover
behind-the-neck-lat-pulldown ez-bar-overhead-extension burpees ez-bar-romanian-deadlift ez-bar-upright-row
'''.split())

# Elegidos a mano en el catálogo de ExerciseDB
A_MANO = {
    'squat': 'qXTaZnJ',              # barbell full squat
    'barbell-row': 'eZyBC3j',        # barbell bent over row
    'leg-press': '10Z2DXU',          # sled 45° leg press
    'leg-extension': 'my33uHU',      # machine leg extension
    'crunches': 'TFqbd8t',           # crunch floor
    'dips': '9WTm7dq',               # chest dip
    'inverted-row': '1YUWDNZ',       # inverted row
    'bulgarian-split-squat': 'gGNQmVt',  # barbell single leg split squat
    't-bar-row': 'aaXr7ld',          # machine t bar row
    'knee-push-ups': 'ZOuKWir',      # kneeling push-up
    'step-ups': 'aXtJhlg',           # dumbbell step-up
    'hip-abduction': 'CHpahtl',      # machine seated hip abduction
    'hip-adduction': 'oHsrypV',      # machine seated hip adduction
    'cable-crunch': 'CUmLRTA',       # cable kneeling crunch
    'pec-deck': 'v3xmPAR',           # machine seated fly
    'hanging-knee-raise': '03lzqwk',  # assisted hanging knee raise
    'side-lunge': 'py1HSzx',         # barbell lateral lunge
    'clean': 'SiWCcTN',              # power clean
    'snatch': 'xHKN2s8',             # barbell single-arm snatch
    'ohp': 'Kyd9Rz5',                # barbell standing military press
    # Revisados cuadro a cuadro: el GIF que salía por nombre mostraba otra cosa
    'single-arm-db-row': 'C0MA9bC',  # salía un remo en espaldera
    'machine-shoulder-press': 'dNFYIU1',  # salía una sentadilla con landmine
    'glute-kickback': 'Kpajagk',     # cable kickback es de deltoides posterior
    'cable-kickback': 'Kpajagk',     # cable standing hip extension
    'cable-tricep-kickback': 'vvNjDJS',  # cable two-arm triceps kickback
}

# Revisados en video y descartados después
DESCARTADOS = {
    'ez-bar-front-raise',            # sale un pullover acostado
    'barbell-front-raise',           # sostiene la barra de un extremo, en diagonal
    'box-jump',                      # baja de un banco, no salta al cajón
}

pares = json.load(open(sys.argv[1], encoding='utf-8'))
final = []
for p in pares:
    slug = p['slug']
    if slug in DESCARTADOS:
        continue
    if slug in A_MANO:
        final.append({'slug': slug, 'exdb_id': A_MANO[slug]})
    elif slug in RECHAZOS:
        continue
    elif p['puntaje'] >= 0.6 or slug in ACEPTAR:
        final.append({'slug': slug, 'exdb_id': p['exdb_id']})
json.dump(final, open(sys.argv[2], 'w', encoding='utf-8'), indent=1)
print(len(final), 'ejercicios con animación')
