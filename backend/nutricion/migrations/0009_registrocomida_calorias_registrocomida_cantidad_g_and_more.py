from django.db import migrations, models
import django.db.models.deletion
import re


def corregir_esquema_registro(apps, schema_editor):
    connection = schema_editor.connection

    if connection.vendor != "mysql":
        raise RuntimeError("Esta migración está preparada para MariaDB/MySQL.")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT DATABASE()
        """)
        database = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'registro_comidas'
        """, [database])

        columnas = {fila[0] for fila in cursor.fetchall()}

        # Agregar solamente las columnas que todavía no existan.
        columnas_nuevas = {
            "calorias": "DOUBLE NOT NULL DEFAULT 0",
            "cantidad_g": "DOUBLE NOT NULL DEFAULT 100",
            "carbohidratos_g": "DOUBLE NOT NULL DEFAULT 0",
            "comida_nombre": "VARCHAR(120) NOT NULL DEFAULT ''",
            "grasas_g": "DOUBLE NOT NULL DEFAULT 0",
            "proteinas_g": "DOUBLE NOT NULL DEFAULT 0",
            "tipo": "VARCHAR(20) NOT NULL DEFAULT ''",
        }

        for nombre, definicion in columnas_nuevas.items():
            if nombre not in columnas:
                cursor.execute(
                    f"ALTER TABLE `registro_comidas` "
                    f"ADD COLUMN `{nombre}` {definicion}"
                )

        # Obtener el tipo real de la llave primaria de comidas.
        cursor.execute("""
            SELECT COLUMN_TYPE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'comidas'
              AND COLUMN_NAME = 'id'
        """, [database])

        resultado = cursor.fetchone()

        if not resultado:
            raise RuntimeError("No se encontró comidas.id.")

        tipo_id = resultado[0]

        # Aceptar únicamente tipos enteros compatibles.
        if not re.fullmatch(
            r"(tinyint|smallint|mediumint|int|bigint)"
            r"(?:\(\d+\))?(?: unsigned)?",
            tipo_id,
            re.IGNORECASE,
        ):
            raise RuntimeError(
                f"Tipo inesperado para comidas.id: {tipo_id}"
            )

        # Buscar una relación previa sobre comida_id.
        cursor.execute("""
            SELECT k.CONSTRAINT_NAME, r.DELETE_RULE
            FROM information_schema.KEY_COLUMN_USAGE AS k
            JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
              ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
             AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
             AND r.TABLE_NAME = k.TABLE_NAME
            WHERE k.TABLE_SCHEMA = %s
              AND k.TABLE_NAME = 'registro_comidas'
              AND k.COLUMN_NAME = 'comida_id'
              AND k.REFERENCED_TABLE_NAME = 'comidas'
        """, [database])
        relaciones = cursor.fetchall()

        # Eliminar la relación anterior si no tiene SET NULL.
        for nombre_fk, regla in relaciones:
            if regla.upper() != "SET NULL":
                nombre_seguro = nombre_fk.replace("`", "")
                cursor.execute(
                    f"ALTER TABLE `registro_comidas` "
                    f"DROP FOREIGN KEY `{nombre_seguro}`"
                )

        # Asegurar que ambas columnas tengan el mismo tipo.
        cursor.execute(
            f"ALTER TABLE `registro_comidas` "
            f"MODIFY COLUMN `comida_id` {tipo_id} NULL"
        )

        # Crear la relación solamente si todavía no existe.
        cursor.execute("""
            SELECT k.CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE AS k
            JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
              ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
             AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
             AND r.TABLE_NAME = k.TABLE_NAME
            WHERE k.TABLE_SCHEMA = %s
              AND k.TABLE_NAME = 'registro_comidas'
              AND k.COLUMN_NAME = 'comida_id'
              AND k.REFERENCED_TABLE_NAME = 'comidas'
              AND r.DELETE_RULE = 'SET NULL'
        """, [database])

        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE `registro_comidas`
                ADD CONSTRAINT `registro_comidas_comida_id_fk`
                FOREIGN KEY (`comida_id`)
                REFERENCES `comidas` (`id`)
                ON DELETE SET NULL
            """)


class Migration(migrations.Migration):

    dependencies = [
        ("nutricion", "0008_alter_plannutricional_unique_together"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    corregir_esquema_registro,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="registrocomida",
                    name="calorias",
                    field=models.FloatField(default=0),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="cantidad_g",
                    field=models.FloatField(default=100),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="carbohidratos_g",
                    field=models.FloatField(default=0),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="comida_nombre",
                    field=models.CharField(
                        blank=True,
                        default="",
                        max_length=120,
                    ),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="grasas_g",
                    field=models.FloatField(default=0),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="proteinas_g",
                    field=models.FloatField(default=0),
                ),
                migrations.AddField(
                    model_name="registrocomida",
                    name="tipo",
                    field=models.CharField(
                        blank=True,
                        default="",
                        max_length=20,
                    ),
                ),
                migrations.AlterField(
                    model_name="registrocomida",
                    name="comida",
                    field=models.ForeignKey(
                        blank=True,
                        db_column="comida_id",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="registros",
                        to="nutricion.comida",
                    ),
                ),
            ],
        ),
    ]