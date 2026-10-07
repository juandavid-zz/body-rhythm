from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('nutricion', '0005_alter_comida_options_alter_plannutricional_options_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name='comida',
                    name='alimento',
                ),
                migrations.DeleteModel(
                    name='Alimento',
                ),
                migrations.DeleteModel(
                    name='CategoriaAlimento',
                ),
            ],
        ),
    ]