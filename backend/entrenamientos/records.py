"""
Récords personales (PR), como en Hevy.

Por cada ejercicio de un entrenamiento se toma su mejor marca y se compara
con la mejor marca de ese ejercicio en todos los entrenamientos ANTERIORES
del mismo usuario. Si la supera, es un récord. La primera vez que se hace
un ejercicio no cuenta: no hay con qué comparar.

Qué se compara según el ejercicio:
- con peso: el peso más alto levantado (con al menos una repetición);
- con peso corporal (sin peso): la mayor cantidad de repeticiones en una serie;
- por tiempo: la serie más larga.
"""

import unicodedata


def _clave(nombre):
    sin_tildes = unicodedata.normalize('NFKD', str(nombre or '')).encode('ascii', 'ignore').decode()
    return ' '.join(sin_tildes.lower().split())


def mejor_marca(ejercicio):
    """(tipo, valor) de la mejor serie completada, o None si no hay ninguna."""
    hechas = [s for s in ejercicio.get('series') or [] if s.get('hecho')]
    if not hechas:
        return None

    if ejercicio.get('por_tiempo'):
        valor = max(s.get('duracion_segundos') or 0 for s in hechas)
        return ('tiempo', valor) if valor > 0 else None

    con_peso = [s for s in hechas if (s.get('peso_kg') or 0) > 0 and (s.get('reps') or 0) > 0]
    if con_peso:
        return 'peso', max(s['peso_kg'] for s in con_peso)

    valor = max(s.get('reps') or 0 for s in hechas)
    return ('reps', valor) if valor > 0 else None


def _mejores_anteriores(registros):
    """{(clave del ejercicio, tipo): mejor valor} de una lista de entrenamientos."""
    mejores = {}
    for registro in registros:
        for ejercicio in registro.ejercicios or []:
            marca = mejor_marca(ejercicio)
            if marca is None:
                continue
            tipo, valor = marca
            clave = (_clave(ejercicio.get('nombre')), tipo)
            mejores[clave] = max(valor, mejores.get(clave, 0))
    return mejores


def calcular_records(registro):
    """Lista de récords del entrenamiento frente a los anteriores del usuario."""
    from .models import RegistroEntrenamiento

    anteriores = (
        RegistroEntrenamiento.objects
        .filter(usuario_id=registro.usuario_id, fecha__lt=registro.fecha)
        .exclude(id=registro.id)
        .only('ejercicios')
    )
    mejores = _mejores_anteriores(anteriores)

    records = []
    for ejercicio in registro.ejercicios or []:
        marca = mejor_marca(ejercicio)
        if marca is None:
            continue
        tipo, valor = marca
        anterior = mejores.get((_clave(ejercicio.get('nombre')), tipo))
        if anterior is not None and valor > anterior:
            records.append({
                'ejercicio': ejercicio.get('nombre'),
                'tipo': tipo,
                'valor': valor,
                'anterior': anterior,
            })
    return records
