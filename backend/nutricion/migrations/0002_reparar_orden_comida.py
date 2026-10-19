from django.db import migrations


def agregar_orden(apps, schema_editor):
    # Solo repara bases antiguas: en una base nueva 0001 ya crea la columna.
    with schema_editor.connection.cursor() as cursor:
        columnas = [
            col.name
            for col in schema_editor.connection.introspection.get_table_description(cursor, 'comidas')
        ]
        if 'orden' not in columnas:
            cursor.execute("ALTER TABLE comidas ADD COLUMN orden INT UNSIGNED NOT NULL DEFAULT 0")


class Migration(migrations.Migration):

    dependencies = [
        ('nutricion', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(agregar_orden, migrations.RunPython.noop),
    ]
