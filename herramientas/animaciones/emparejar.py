"""Empareja cada ejercicio de RepDB con el más parecido de ExerciseDB.

Uso: python emparejar.py <free.es.json> <catalogo_exdb.json> <salida.json>
"""
import difflib
import json
import re
import sys

repdb = json.load(open(sys.argv[1], encoding='utf-8'))['exercises']
exdb = json.load(open(sys.argv[2], encoding='utf-8'))

SINONIMOS = {
    'db': 'dumbbell', 'dumbbells': 'dumbbell', 'bb': 'barbell', 'kb': 'kettlebell',
    'pullup': 'pull up', 'pullups': 'pull up', 'chinup': 'chin up', 'chinups': 'chin up',
    'pushup': 'push up', 'pushups': 'push up', 'situp': 'sit up', 'situps': 'sit up',
    'pulldown': 'pulldown', 'lat': 'lat', 'ez': 'ez', 'machine': 'machine', 'smith': 'smith', 'rdl': 'romanian deadlift',
    'flyes': 'fly', 'flys': 'fly', 'flies': 'fly', 'raises': 'raise', 'curls': 'curl',
    'rows': 'row', 'extensions': 'extension', 'presses': 'press', 'squats': 'squat',
    'lunges': 'lunge', 'crunches': 'crunch', 'dips': 'dip', 'shrugs': 'shrug',
    'kickbacks': 'kickback', 'deadlifts': 'deadlift', 'jacks': 'jack', 'climbers': 'climber',
    'thrusts': 'thrust', 'bridges': 'bridge', 'stretches': 'stretch',
}
EQUIPO = {
    'barbell': {'barbell', 'olympic barbell', 'ez barbell', 'trap bar'},
    'ez_bar': {'ez barbell'},
    'dumbbell': {'dumbbell'},
    'kettlebell': {'kettlebell'},
    'cable': {'cable'},
    'machine': {'leverage machine', 'sled machine', 'smith machine', 'machine'},
    'smith_machine': {'smith machine'},
    'bodyweight': {'body weight', 'bodyweight', 'assisted', 'weighted'},
    'band': {'band', 'resistance band'},
    'ab_wheel': {'wheel roller'},
}


def tokens(texto):
    texto = texto.lower().replace('-', ' ').replace('_', ' ')
    texto = re.sub(r'[^a-z0-9 ]', ' ', texto)
    salida = []
    for t in texto.split():
        t = SINONIMOS.get(t, t)
        salida += t.split()
    return salida


candidatos = [(e, tokens(e['name']), set(x.lower() for x in e.get('equipments', []))) for e in exdb]
resultado = []
for r in repdb:
    tr = tokens(r['id'])
    equipo_r = EQUIPO.get(r.get('equipment') or '', set())
    # El nombre de RepDB suele omitir el equipo ("bench-press"); ExerciseDB lo pone delante
    palabra = {'barbell': 'barbell', 'dumbbell': 'dumbbell', 'kettlebell': 'kettlebell', 'cable': 'cable',
               'ez_bar': 'ez barbell', 'smith_machine': 'smith', 'resistance_band': 'band', 'loop_band': 'band'}.get(r.get('equipment') or '')
    if palabra and not set(palabra.split()) & set(tr):
        tr = palabra.split() + tr
    mejor = []
    for e, te, eq in candidatos:
        a, b = set(tr), set(te)
        comun = len(a & b)
        cubre = 0.6 * comun / len(a) + 0.4 * comun / len(b)
        sec = difflib.SequenceMatcher(None, ' '.join(tr), ' '.join(te)).ratio()
        p = 0.75 * cubre + 0.25 * sec
        if equipo_r and eq and not (equipo_r & eq):
            p -= 0.25
        mejor.append((p, e))
    mejor.sort(key=lambda x: -x[0])
    p, e = mejor[0]
    resultado.append({
        'slug': r['id'], 'nombre': r['name'], 'equipo': r.get('equipment'),
        'exdb_id': e['exerciseId'], 'exdb_nombre': e['name'], 'puntaje': round(p, 3),
        'otros': [(round(q, 3), x['exerciseId'], x['name']) for q, x in mejor[1:4]],
    })

json.dump(resultado, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for umbral in (0.9, 0.8, 0.7, 0.6):
    print(umbral, sum(1 for x in resultado if x['puntaje'] >= umbral))
