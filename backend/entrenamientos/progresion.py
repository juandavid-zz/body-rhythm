"""
"Próxima carga": cuánto levantar la próxima vez en cada ejercicio.

Sigue la doble progresión que usan los entrenadores (y apps como Fitbod):
- Si completaste todas las series de trabajo llegando a las repeticiones
  objetivo → la próxima vez SUBE el peso (2,5 kg tren superior, 5 kg piernas).
- Si las completaste pero te quedaste un poco corto → mismo peso, a sumar reps.
- Si te quedaste muy corto dos sesiones seguidas con el mismo peso → BAJA un
  10 % para recuperar técnica (descarga).
Sin peso (peso corporal) se progresa en repeticiones, y por tiempo en segundos.

Son reglas fijas, no IA: siempre dan el mismo resultado, se pueden explicar
y no cuestan nada.
"""

from .records import _clave

TIPOS_SIN_PROGRESION = {'calentamiento'}   # las de calentamiento no cuentan
REPS_POR_DEFECTO = 10
MARGEN_REPS = 2                  # hasta 2 reps por debajo del objetivo: se mantiene el peso
SEGUNDOS_EXTRA = 5
DESCARGA = 0.9                   # baja al 90 %
GRUPOS_PIERNA = {'upper_legs', 'lower_legs', 'legs', 'glutes', 'calves'}
INCREMENTO_SUPERIOR = 2.5
INCREMENTO_PIERNA = 5.0
PESO_MAXIMO = 600                # por encima de esto se asume un error de escritura


def _kg(valor):
    """2.5 → '2,5' y 5.0 → '5' (como se escribe en español)."""
    return f'{valor:g}'.replace('.', ',')


def _redondear(peso, paso=2.5):
    """Al múltiplo de 2,5 kg más cercano (los discos que hay en un gym)."""
    return round(round(peso / paso) * paso, 2)


def _series_de_trabajo(ejercicio):
    return [s for s in ejercicio.get('series') or [] if (s.get('tipo') or 'normal') not in TIPOS_SIN_PROGRESION]


def _evaluar(ejercicio, reps_objetivo):
    """
    Cómo le fue en una sesión: (peso de trabajo, reps mínimas, completó todo, se quedó corto).
    "Se quedó corto" = alguna serie sin hacer o por debajo del margen.
    """
    trabajo = _series_de_trabajo(ejercicio)
    hechas = [s for s in trabajo if s.get('hecho')]
    if not hechas:
        return None

    con_peso = [s for s in hechas if (s.get('peso_kg') or 0) > 0]
    peso = max((s['peso_kg'] for s in con_peso), default=0)
    # Las reps que cuentan son las de las series hechas con el peso de trabajo
    del_peso = [s for s in hechas if (s.get('peso_kg') or 0) == peso] if peso else hechas
    reps_minimas = min(int(s.get('reps') or 0) for s in del_peso)
    completo = len(hechas) == len(trabajo)
    corto = not completo or reps_minimas < reps_objetivo - MARGEN_REPS
    return peso, reps_minimas, completo, corto


def proxima_carga(sesiones, reps_objetivo=None, grupo=None):
    """
    `sesiones`: el mismo ejercicio en los entrenamientos anteriores, del más
    reciente al más viejo (como se guardan en RegistroEntrenamiento.ejercicios).
    Devuelve la sugerencia o None si todavía no hay con qué calcular.
    """
    if not sesiones:
        return None
    ultima = sesiones[0]

    # Por tiempo: se progresa en segundos
    if ultima.get('por_tiempo'):
        trabajo = _series_de_trabajo(ultima)
        hechas = [s for s in trabajo if s.get('hecho') and (s.get('duracion_segundos') or 0) > 0]
        if not hechas:
            return None
        duracion = max(s['duracion_segundos'] for s in hechas)
        if len(hechas) == len(trabajo):
            return {
                'tipo': 'tiempo', 'tendencia': 'sube', 'duracion_segundos': duracion + SEGUNDOS_EXTRA,
                'motivo': f'Aguantaste todas las series: suma {SEGUNDOS_EXTRA} segundos.',
            }
        return {
            'tipo': 'tiempo', 'tendencia': 'igual', 'duracion_segundos': duracion,
            'motivo': 'Completa todas las series con este tiempo antes de subir.',
        }

    trabajo_ultima = _series_de_trabajo(ultima)
    objetivo = int(reps_objetivo or max((int(s.get('reps') or 0) for s in trabajo_ultima), default=0) or REPS_POR_DEFECTO)
    evaluacion = _evaluar(ultima, objetivo)
    if evaluacion is None:
        return None
    peso, reps_minimas, completo, corto = evaluacion

    # Peso corporal: se progresa en repeticiones
    if not peso:
        if completo and reps_minimas >= objetivo:
            return {
                'tipo': 'reps', 'tendencia': 'sube', 'reps': objetivo + 1,
                'motivo': f'Hiciste {objetivo} en todas las series: intenta una más.',
            }
        return {
            'tipo': 'reps', 'tendencia': 'igual', 'reps': objetivo,
            'motivo': f'Busca llegar a {objetivo} reps en todas las series.',
        }

    if peso > PESO_MAXIMO:
        return None  # dato mal escrito: mejor no sugerir nada

    incremento = INCREMENTO_PIERNA if grupo in GRUPOS_PIERNA else INCREMENTO_SUPERIOR

    if completo and reps_minimas >= objetivo:
        return {
            'tipo': 'peso', 'tendencia': 'sube', 'peso_kg': _redondear(peso + incremento), 'reps': objetivo,
            'motivo': f'Completaste todas las series con {objetivo} reps: sube {_kg(incremento)} kg.',
        }

    if corto and len(sesiones) > 1:
        anterior = _evaluar(sesiones[1], objetivo)
        if anterior and anterior[0] == peso and anterior[3]:
            return {
                'tipo': 'peso', 'tendencia': 'baja', 'peso_kg': max(_redondear(peso * DESCARGA), 0), 'reps': objetivo,
                'motivo': 'Dos sesiones seguidas sin completarlo: baja un 10 % para afinar la técnica.',
            }

    return {
        'tipo': 'peso', 'tendencia': 'igual', 'peso_kg': peso, 'reps': objetivo,
        'motivo': f'Mismo peso: busca {objetivo} reps en todas las series.',
    }


def sesiones_por_ejercicio(registros, nombres, maximo=2):
    """
    {nombre pedido: [ejercicio de la sesión más reciente, la anterior, ...]}
    recorriendo los entrenamientos del más nuevo al más viejo.
    """
    pedidos = {_clave(n): n for n in nombres if str(n or '').strip()}
    encontrados = {clave: [] for clave in pedidos}
    for registro in registros:
        for ejercicio in registro.ejercicios or []:
            clave = _clave(ejercicio.get('nombre'))
            lista = encontrados.get(clave)
            if lista is not None and len(lista) < maximo and any(s.get('hecho') for s in ejercicio.get('series') or []):
                lista.append(ejercicio)
        if all(len(lista) >= maximo for lista in encontrados.values()):
            break
    return {pedidos[clave]: lista for clave, lista in encontrados.items()}
