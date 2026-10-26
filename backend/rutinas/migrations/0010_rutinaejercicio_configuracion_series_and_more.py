
from django.db import migrations, models


def ensure_columns(apps, schema_editor):
    model = apps.get_model('rutinas', 'RutinaEjercicio')
    table = model._meta.db_table
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        existing = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, table
            )
        }

    fields = [
        (
            'configuracion_series',
            models.JSONField(
                blank=True,
                default=list,
                verbose_name='Configuración de series',
            ),
        ),
        (
            'notas',
            models.TextField(
                blank=True,
                default='',
                verbose_name='Notas del ejercicio',
            ),
        ),
        (
            'unidad_peso',
            models.CharField(
                choices=[('kg', 'Kilogramos'), ('lb', 'Libras')],
                default='kg',
                max_length=2,
                verbose_name='Unidad de peso',
            ),
        ),
    ]

    for name, field in fields:
        if name not in existing:
            field.contribute_to_class(model, name)
            schema_editor.add_field(model, field)


class Migration(migrations.Migration):

    dependencies = [
        ('rutinas', '0009_reemplazar_ejercicio_antiguo'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    ensure_columns,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='rutinaejercicio',
                    name='configuracion_series',
                    field=models.JSONField(
                        blank=True,
                        default=list,
                        verbose_name='Configuración de series',
                    ),
                ),
                migrations.AddField(
                    model_name='rutinaejercicio',
                    name='notas',
                    field=models.TextField(
                        blank=True,
                        default='',
                        verbose_name='Notas del ejercicio',
                    ),
                ),
                migrations.AddField(
                    model_name='rutinaejercicio',
                    name='unidad_peso',
                    field=models.CharField(
                        choices=[('kg', 'Kilogramos'), ('lb', 'Libras')],
                        default='kg',
                        max_length=2,
                        verbose_name='Unidad de peso',
                    ),
                ),
            ],
        ),
    ]
