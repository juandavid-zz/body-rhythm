from django.db import migrations, models


def quitar_staff_a_usuarios_normales(apps, schema_editor):
    # is_staff era True por defecto: cualquier cuenta pasaba IsAdminUser y podía
    # listar los datos de todos los usuarios. Solo lo conservan los superusuarios.
    AuthUsuario = apps.get_model('users', 'AuthUsuario')
    AuthUsuario.objects.filter(is_superuser=False).update(is_staff=False)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_privacidad_cuenta'),
    ]

    operations = [
        migrations.AlterField(
            model_name='authusuario',
            name='is_staff',
            field=models.BooleanField(default=False, verbose_name='Administrador'),
        ),
        migrations.RunPython(quitar_staff_a_usuarios_normales, migrations.RunPython.noop),
    ]
