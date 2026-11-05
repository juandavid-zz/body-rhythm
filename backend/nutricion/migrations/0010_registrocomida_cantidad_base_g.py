from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutricion', '0009_registrocomida_calorias_registrocomida_cantidad_g_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='comida',
            name='cantidad_base_g',
            field=models.FloatField(default=100),
        ),
    ]