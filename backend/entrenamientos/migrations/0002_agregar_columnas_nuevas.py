from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('entrenamientos', '0001_initial'),
    ]

    operations = [
        # Columnas nuevas en tabla rutinas
        migrations.AddField(
            model_name='rutina',
            name='rango_imc',
            field=models.CharField(
                max_length=20,
                null=True, blank=True,
                choices=[
                    ('bajo_peso', 'Bajo Peso (IMC < 18.5)'),
                    ('normal', 'Normal (IMC 18.5 - 24.9)'),
                    ('sobrepeso', 'Sobrepeso (IMC 25 - 29.9)'),
                    ('obesidad', 'Obesidad (IMC >= 30)'),
                ]
            ),
        ),
        migrations.AddField(
            model_name='rutina',
            name='dias_por_semana',
            field=models.IntegerField(default=3),
        ),
        migrations.AddField(
            model_name='rutina',
            name='duracion_minutos',
            field=models.IntegerField(default=45),
        ),

        # Columnas nuevas en tabla ejercicios
        migrations.AddField(
            model_name='ejercicio',
            name='grupo_muscular',
            field=models.CharField(
                max_length=30,
                null=True, blank=True,
                choices=[
                    ('pecho', 'Pecho'),
                    ('espalda', 'Espalda'),
                    ('hombros', 'Hombros'),
                    ('biceps', 'Biceps'),
                    ('triceps', 'Triceps'),
                    ('abdomen', 'Abdomen'),
                    ('gluteos', 'Gluteos'),
                    ('cuadriceps', 'Cuadriceps'),
                    ('isquiotibiales', 'Isquiotibiales'),
                    ('pantorrillas', 'Pantorrillas'),
                    ('cardio', 'Cardio'),
                    ('cuerpo_completo', 'Cuerpo Completo'),
                ]
            ),
        ),
        migrations.AddField(
            model_name='ejercicio',
            name='nivel',
            field=models.CharField(
                max_length=20,
                null=True, blank=True,
                choices=[
                    ('principiante', 'Principiante'),
                    ('intermedio', 'Intermedio'),
                    ('avanzado', 'Avanzado'),
                ]
            ),
        ),
        migrations.AddField(
            model_name='ejercicio',
            name='dia',
            field=models.CharField(
                max_length=15,
                null=True, blank=True,
                choices=[
                    ('lunes', 'Lunes'),
                    ('martes', 'Martes'),
                    ('miercoles', 'Miercoles'),
                    ('jueves', 'Jueves'),
                    ('viernes', 'Viernes'),
                    ('sabado', 'Sabado'),
                    ('domingo', 'Domingo'),
                ]
            ),
        ),
    ]
