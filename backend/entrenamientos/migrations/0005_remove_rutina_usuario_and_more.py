from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rutinas', '0005_completar_catalogo_ejercicios'),
        ('entrenamientos', '0004_alter_ejercicio_id_alter_historialentrenamiento_id_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='rutina',
            name='usuario',
        ),

        migrations.AlterField(
            model_name='historialentrenamiento',
            name='rutina',
            field=models.ForeignKey(
                db_column='rutina_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='rutinas.rutina',
            ),
        ),

        migrations.AlterField(
            model_name='progresoejercicio',
            name='ejercicio',
            field=models.ForeignKey(
                db_column='ejercicio_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='rutinas.ejercicio',
            ),
        ),

        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.DeleteModel(
                    name='Ejercicio',
                ),
                migrations.DeleteModel(
                    name='Rutina',
                ),
            ],
        ),
    ]