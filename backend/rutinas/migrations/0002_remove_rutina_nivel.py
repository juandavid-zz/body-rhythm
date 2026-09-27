from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rutinas', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='rutina',
            name='nivel',
        ),
    ]
