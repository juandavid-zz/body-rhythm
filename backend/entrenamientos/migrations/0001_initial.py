
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0002_authusuario_last_login_authusuario_password'),
    ]

    operations = [
        migrations.CreateModel(
            name='Rutina',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=150)),
                ('descripcion', models.TextField(null=True, blank=True)),
                ('nivel', models.CharField(max_length=20, null=True, blank=True, choices=[('principiante', 'Principiante'), ('intermedio', 'Intermedio'), ('avanzado', 'Avanzado')])),
                ('objetivo', models.CharField(max_length=30, null=True, blank=True, choices=[('perder_peso', 'Perder Peso'), ('ganar_musculo', 'Ganar Músculo'), ('mantenerse', 'Mantenerse'), ('mejorar_resistencia', 'Mejorar Resistencia')])),
                ('imc_referencia', models.FloatField(null=True, blank=True)),
                ('generada_por_ia', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('usuario', models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.CASCADE, to='users.usuario', db_column='usuario_id')),
            ],
            options={
                'db_table': 'rutinas',
            },
        ),
        migrations.CreateModel(
            name='Ejercicio',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=150)),
                ('descripcion', models.TextField(null=True, blank=True)),
                ('series', models.IntegerField(null=True, blank=True)),
                ('repeticiones', models.IntegerField(null=True, blank=True)),
                ('duracion_segundos', models.IntegerField(null=True, blank=True)),
                ('descanso_segundos', models.IntegerField(null=True, blank=True)),
                ('orden', models.IntegerField(null=True, blank=True)),
                ('rutina', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ejercicios', to='entrenamientos.rutina', db_column='rutina_id')),
            ],
            options={
                'db_table': 'ejercicios',
                'ordering': ['dia', 'orden'],
            },
        ),
        migrations.CreateModel(
            name='HistorialEntrenamiento',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('duracion_minutos', models.IntegerField(null=True, blank=True)),
                ('calorias_quemadas', models.FloatField(null=True, blank=True)),
                ('completado', models.BooleanField(default=False)),
                ('notas', models.TextField(null=True, blank=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.usuario', db_column='usuario_id')),
                ('rutina', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='entrenamientos.rutina', db_column='rutina_id')),
            ],
            options={
                'db_table': 'historial_entrenamientos',
            },
        ),
    ]