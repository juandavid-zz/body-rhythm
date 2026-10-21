from django.db import migrations, models


def calcular_records_existentes(apps, schema_editor):
    """Recorre los entrenamientos de cada usuario en orden de fecha y marca sus récords."""
    from entrenamientos.records import _clave, mejor_marca

    RegistroEntrenamiento = apps.get_model('entrenamientos', 'RegistroEntrenamiento')
    mejores = {}  # (usuario, ejercicio, tipo) -> mejor valor hasta ese momento

    for registro in RegistroEntrenamiento.objects.order_by('usuario_id', 'fecha', 'id'):
        records = []
        for ejercicio in registro.ejercicios or []:
            marca = mejor_marca(ejercicio)
            if marca is None:
                continue
            tipo, valor = marca
            clave = (registro.usuario_id, _clave(ejercicio.get('nombre')), tipo)
            anterior = mejores.get(clave)
            if anterior is not None and valor > anterior:
                records.append({'ejercicio': ejercicio.get('nombre'), 'tipo': tipo, 'valor': valor, 'anterior': anterior})
            mejores[clave] = max(valor, anterior or 0)

        if records:
            registro.records = records
            registro.save(update_fields=['records'])


class Migration(migrations.Migration):

    dependencies = [
        ('entrenamientos', '0006_registroentrenamiento'),
    ]

    operations = [
        migrations.AddField(
            model_name='registroentrenamiento',
            name='records',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(calcular_records_existentes, migrations.RunPython.noop),
    ]
