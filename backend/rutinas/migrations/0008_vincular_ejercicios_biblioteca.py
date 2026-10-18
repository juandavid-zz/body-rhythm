
from django.db import migrations
import unicodedata


EQUIVALENCIAS = {
    "Sentadilla": "Sentadilla con Peso Corporal",
    "Peso muerto rumano": "Peso Muerto Rumano",
    "Hip thrust": "Hip Thrust",
    "Press inclinado con barra": "Incline Bench Press - Barbell",
    "Dominadas": "Dominadas",
    "Press militar": "Press Militar con Barra",
    "Crunch abdominal": "Abdominal Crunch",
    "Caminata": "Walking",
    "Press inclinado con mancuernas": "Press Inclinado con Mancuernas",
    "Dominadas asistidas": "Dominadas Asistidas",
    "Curl de bíceps con barra": "Curl con Barra",
    "Fondos de tríceps": "Fondos de Tríceps",
    "Sentadilla goblet": "Sentadilla Goblet",
    "Peso muerto piernas rígidas": "Peso Muerto con Piernas Rígidas",
    "Puente de glúteos": "Puente de Glúteos",
    "Elevación de talones de pie": "Elevación de Talones de Pie",
    "Patada de glúteo": "Patada de Glúteo",
    "Caminata rápida": "Caminata Rápida",
    "Correr": "Correr",
    "Bicicleta": "Cycling",
    "Bicicleta estática": "Stationary Bike",
    "Sentadilla con press": "Dumbbell Thruster",
    "Thruster": "Thruster",
}


def normalizar(nombre):
    nombre = unicodedata.normalize("NFKD", nombre)
    nombre = "".join(
        caracter
        for caracter in nombre
        if not unicodedata.combining(caracter)
    )
    return " ".join(nombre.casefold().split())


def vincular_ejercicios(apps, schema_editor):
    RutinaEjercicio = apps.get_model("rutinas", "RutinaEjercicio")
    EjercicioAntiguo = apps.get_model("rutinas", "Ejercicio")
    EjercicioBiblioteca = apps.get_model("users", "Ejercicio")

    equivalencias = {
        normalizar(antiguo): normalizar(nuevo)
        for antiguo, nuevo in EQUIVALENCIAS.items()
    }

    relaciones = list(
        RutinaEjercicio.objects.filter(
            ejercicio_biblioteca__isnull=True
        )
    )

    if not relaciones:
        print("No hay relaciones pendientes de vincular.")
        return

    ids_antiguos = {relacion.ejercicio_id for relacion in relaciones}

    nombres_antiguos = {
        ejercicio.pk: ejercicio.nombre
        for ejercicio in EjercicioAntiguo.objects.filter(
            pk__in=ids_antiguos
        )
    }

    pendientes = []
    plan = []

    # Primera fase: validar las equivalencias antiguas.
    for relacion in relaciones:
        nombre_antiguo = nombres_antiguos.get(relacion.ejercicio_id)

        if nombre_antiguo is None:
            pendientes.append(
                f"Relación {relacion.pk}: no existe el ejercicio antiguo "
                f"{relacion.ejercicio_id}"
            )
            continue

        nombre_normalizado = normalizar(nombre_antiguo)
        nombre_nuevo = equivalencias.get(nombre_normalizado)

        if nombre_nuevo is None:
            pendientes.append(
                f"{nombre_antiguo}: no tiene equivalencia configurada"
            )
            continue

        plan.append((relacion, nombre_nuevo, nombre_antiguo))

    # Segunda validación: comprobar que cada destino exista
    # exactamente una vez en la biblioteca.
    destinos = {nombre_nuevo for _, nombre_nuevo, _ in plan}
    biblioteca = {}

    for ejercicio in EjercicioBiblioteca.objects.all().iterator():
        nombre = normalizar(ejercicio.nombre)

        if nombre in destinos:
            biblioteca.setdefault(nombre, []).append(ejercicio.pk)

    for _, nombre_nuevo, nombre_antiguo in plan:
        coincidencias = biblioteca.get(nombre_nuevo, [])

        if len(coincidencias) != 1:
            pendientes.append(
                f"{nombre_antiguo}: el destino normalizado "
                f"'{nombre_nuevo}' tiene {len(coincidencias)} "
                "coincidencias en la biblioteca; se esperaba exactamente 1"
            )

    # No modificar nada si hay algún problema.
    if pendientes:
        raise RuntimeError(
            "No se modificó ninguna relación. Corrige estos problemas:\n"
            + "\n".join(sorted(set(pendientes)))
        )

    # Solo se escribe después de validar todas las relaciones.
    for relacion, nombre_nuevo, _ in plan:
        relacion.ejercicio_biblioteca_id = biblioteca[nombre_nuevo][0]
        relacion.save(update_fields=["ejercicio_biblioteca"])

    print(f"Migración completada: {len(plan)} relaciones vinculadas.")


class Migration(migrations.Migration):
    atomic = True

    dependencies = [
        ("rutinas", "0007_rutinaejercicio_ejercicio_biblioteca"),
    ]

    operations = [
        migrations.RunPython(
            vincular_ejercicios,
            migrations.RunPython.noop,
        ),
    ]
