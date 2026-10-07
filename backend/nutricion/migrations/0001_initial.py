from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('users', '0003_authusuario_groups_authusuario_is_active_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlanNutricional',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True)),
                ('calorias_diarias', models.FloatField(default=0)),
                ('proteinas_g', models.FloatField(default=0)),
                ('carbohidratos_g', models.FloatField(default=0)),
                ('grasas_g', models.FloatField(default=0)),
                ('generada_por_ia', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('usuario', models.ForeignKey(db_column='usuario_id', on_delete=django.db.models.deletion.CASCADE, related_name='planes_nutricionales', to='users.usuario')),
            ],
            options={'db_table': 'planes_nutricionales', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Comida',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('desayuno', 'Desayuno'), ('almuerzo', 'Almuerzo'), ('cena', 'Cena'), ('snack', 'Snack')], max_length=20)),
                ('nombre', models.CharField(max_length=120)),
                ('descripcion', models.TextField(blank=True)),
                ('calorias', models.FloatField(default=0)),
                ('proteinas_g', models.FloatField(default=0)),
                ('carbohidratos_g', models.FloatField(default=0)),
                ('grasas_g', models.FloatField(default=0)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comidas', to='nutricion.plannutricional')),
            ],
            options={'db_table': 'comidas', 'ordering': ['orden', 'id']},
        ),
        migrations.CreateModel(
            name='RegistroComida',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField(auto_now_add=True)),
                ('comida', models.ForeignKey(db_column='comida_id', on_delete=django.db.models.deletion.CASCADE, related_name='registros', to='nutricion.comida')),
                ('usuario', models.ForeignKey(db_column='usuario_id', on_delete=django.db.models.deletion.CASCADE, related_name='registros_comida', to='users.usuario')),
            ],
            options={'db_table': 'registro_comidas', 'ordering': ['-fecha', '-id']},
        ),
    ]
