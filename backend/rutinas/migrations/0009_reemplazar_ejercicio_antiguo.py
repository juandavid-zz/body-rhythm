
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("rutinas", "0008_vincular_ejercicios_biblioteca"),
        ("users", "0009_alter_authusuario_options_alter_ejercicio_options_and_more"),
    ]

    operations = [
        # Eliminar primero la FK antigua y su columna.
        # La asociación moderna permanece guardada en ejercicio_biblioteca_id.
        migrations.RemoveField(
            model_name="rutinaejercicio",
            name="ejercicio",
        ),

        # Convertir la columna moderna existente en el campo definitivo.
        # Django renombra ejercicio_biblioteca_id a ejercicio_id.
        migrations.RenameField(
            model_name="rutinaejercicio",
            old_name="ejercicio_biblioteca",
            new_name="ejercicio",
        ),

        # Dejar el campo definitivo apuntando a la biblioteca moderna.
        migrations.AlterField(
            model_name="rutinaejercicio",
            name="ejercicio",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="users.ejercicio",
                verbose_name="Ejercicio",
            ),
        ),

        migrations.AlterField(
            model_name="rutina",
            name="ejercicios",
            field=models.ManyToManyField(
                blank=True,
                through="rutinas.RutinaEjercicio",
                to="users.ejercicio",
                verbose_name="Ejercicios",
            ),
        ),

        migrations.AlterField(
            model_name="rutina",
            name="usuario",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="users.usuario",
                verbose_name="Usuario",
            ),
        ),
    ]
