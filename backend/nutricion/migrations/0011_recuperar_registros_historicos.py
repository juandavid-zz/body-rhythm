from django.db import migrations


def recuperar_registros_historicos(apps, schema_editor):
    RegistroComida = apps.get_model("nutricion", "RegistroComida")

    registros = (
        RegistroComida.objects
        .filter(comida__isnull=False, comida_nombre="")
        .select_related("comida")
    )

    pendientes = []

    for registro in registros.iterator():
        comida = registro.comida

        if comida is None:
            continue

        cantidad_base = getattr(comida, "cantidad_base_g", 100) or 100

        registro.comida_nombre = comida.nombre
        registro.tipo = comida.tipo
        registro.cantidad_g = cantidad_base

        # Se copian los valores originales sin recalcularlos.
        registro.calorias = comida.calorias
        registro.proteinas_g = comida.proteinas_g
        registro.carbohidratos_g = comida.carbohidratos_g
        registro.grasas_g = comida.grasas_g

        pendientes.append(registro)

    if pendientes:
        RegistroComida.objects.bulk_update(
            pendientes,
            [
                "comida_nombre",
                "tipo",
                "cantidad_g",
                "calorias",
                "proteinas_g",
                "carbohidratos_g",
                "grasas_g",
            ],
            batch_size=500,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("nutricion", "0010_registrocomida_cantidad_base_g"),
    ]

    operations = [
        migrations.RunPython(
            recuperar_registros_historicos,
            migrations.RunPython.noop,
        ),
    ]
