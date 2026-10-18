"""
Conecta las rutinas que genera el chatbot con la biblioteca de ejercicios
(users.Ejercicio) para poder guardarlas como rutinas del usuario.
"""

import unicodedata

from django.db import transaction

from rutinas.models import Rutina, RutinaEjercicio
from users.models import Ejercicio as EjercicioBiblioteca

MAX_EJERCICIOS_POR_DIA = 12

# Grupos que entiende el chatbot → códigos de la biblioteca (RepDB)
GRUPOS_BIBLIOTECA = {
    "tren superior": ["chest", "back", "shoulders", "upper_arms", "lower_arms"],
    "superior": ["chest", "back", "shoulders", "upper_arms", "lower_arms"],
    "tren inferior": ["upper_legs", "lower_legs"],
    "inferior": ["upper_legs", "lower_legs"],
    "piernas": ["upper_legs", "lower_legs"],
    "core": ["core"],
    "abdomen": ["core"],
}


def normalizar(texto):
    sin_tildes = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return " ".join(sin_tildes.lower().split())


def ejercicios_disponibles():
    return EjercicioBiblioteca.objects.filter(repdb_id__isnull=False)


def catalogo_para_prompt():
    """Lista compacta 'id | nombre | grupo' para que la IA elija ejercicios reales."""
    filas = ejercicios_disponibles().order_by("grupo", "nombre").values_list("id", "nombre", "grupo")
    return "\n".join(f"{id_} | {nombre} | {grupo}" for id_, nombre, grupo in filas)


def _entero(valor, por_defecto, minimo, maximo):
    try:
        return max(minimo, min(maximo, int(float(valor))))
    except (TypeError, ValueError):
        return por_defecto


def vincular_ejercicios(rutina):
    """
    Revisa cada ejercicio de la rutina: si el ejercicio_id que eligió la IA
    existe se usa; si no, se busca por nombre. Agrega la imagen para mostrarla.
    Los que no se encuentran quedan con ejercicio_id = None.
    """
    biblioteca = {e.id: e for e in ejercicios_disponibles()}
    por_nombre = {normalizar(e.nombre): e for e in biblioteca.values()}

    for ejercicio in rutina.get("ejercicios") or []:
        encontrado = None
        try:
            encontrado = biblioteca.get(int(ejercicio.get("ejercicio_id")))
        except (TypeError, ValueError):
            pass
        if encontrado is None:
            encontrado = por_nombre.get(normalizar(ejercicio.get("nombre")))

        ejercicio["ejercicio_id"] = encontrado.id if encontrado else None
        if encontrado:
            ejercicio["nombre"] = encontrado.nombre
            ejercicio["imagen"] = encontrado.imagen_inicio or None

    return rutina


def rutina_respaldo(meta, rango_imc, grupo_muscular=None, max_ejercicios=6):
    """Rutina básica armada con la biblioteca cuando la IA no está disponible."""
    ejercicios = ejercicios_disponibles()
    grupos = GRUPOS_BIBLIOTECA.get(normalizar(grupo_muscular))
    if grupos:
        filtrados = ejercicios.filter(grupo__in=grupos)
        if filtrados.exists():
            ejercicios = filtrados

    elegidos = list(ejercicios.order_by("?")[:max_ejercicios])
    if not elegidos:
        return None

    objetivos = {
        "perder_peso": "pérdida de peso",
        "ganar_musculo": "ganancia muscular",
        "mantenerse": "mantenimiento",
        "mejorar_resistencia": "mejorar la resistencia",
    }
    objetivo = objetivos.get(meta, "un entrenamiento general")

    return {
        "nombre": f"Rutina de respaldo ({grupo_muscular or 'cuerpo completo'})",
        "descripcion": f"Rutina básica orientada a {objetivo} para IMC {rango_imc}.",
        "dias_por_semana": 3,
        "duracion_minutos": 45,
        "ejercicios": [
            {
                "dia": "Día 1",
                "ejercicio_id": e.id,
                "nombre": e.nombre,
                "imagen": e.imagen_inicio or None,
                "series": 3,
                "repeticiones": 12,
                "descanso_segundos": 60,
                "consejo": None,
            }
            for e in elegidos
        ],
    }


@transaction.atomic
def guardar_rutina(usuario, rutina):
    """
    Crea una rutina del usuario por cada día ("Día 1", "Día 2"...).
    Devuelve (rutinas_creadas, nombres_omitidos).
    """
    vincular_ejercicios(rutina)
    nombre_base = str(rutina.get("nombre") or "Rutina del asistente").strip()[:80]
    descripcion = str(rutina.get("objetivo") or rutina.get("descripcion") or "").strip()

    dias = {}
    omitidos = []
    for ejercicio in rutina.get("ejercicios") or []:
        if not ejercicio.get("ejercicio_id"):
            omitidos.append(str(ejercicio.get("nombre") or "Ejercicio"))
            continue
        dia = str(ejercicio.get("dia") or "Día 1").strip()[:15]
        dias.setdefault(dia, []).append(ejercicio)

    varios_dias = len(dias) > 1
    creadas = []
    # Mis rutinas lista primero las más nuevas: se crean al revés para que el Día 1 quede arriba
    for dia, ejercicios in reversed(list(dias.items())):
        nombre = f"{nombre_base} · {dia}" if varios_dias else nombre_base
        nueva = Rutina.objects.create(usuario=usuario, nombre=nombre[:100], descripcion=descripcion)
        RutinaEjercicio.objects.bulk_create([
            RutinaEjercicio(
                rutina=nueva,
                ejercicio_id=ejercicio["ejercicio_id"],
                series=_entero(ejercicio.get("series"), 3, 1, 10),
                repeticiones=_entero(ejercicio.get("repeticiones"), 10, 1, 100),
                descanso_segundos=_entero(ejercicio.get("descanso_segundos"), 60, 0, 600),
                orden=orden,
            )
            for orden, ejercicio in enumerate(ejercicios[:MAX_EJERCICIOS_POR_DIA])
        ])
        creadas.append({"id": nueva.id, "nombre": nueva.nombre, "ejercicios": min(len(ejercicios), MAX_EJERCICIOS_POR_DIA)})

    return list(reversed(creadas)), omitidos
