import re

import django.core.validators
from django.db import migrations, models


def _base_username(usuario):
    # Parte local del correo, o el nombre si no hay correo, solo con caracteres válidos
    origen = (usuario.auth.email or '').split('@')[0] or usuario.nombre or 'usuario'
    base = re.sub(r'[^a-z0-9._]', '', origen.lower())[:26]
    return base if len(base) >= 3 else (base + 'usr')[:26]


def generar_usernames(apps, schema_editor):
    Usuario = apps.get_model('users', 'Usuario')
    usados = set()

    for usuario in Usuario.objects.select_related('auth').order_by('id'):
        base = _base_username(usuario)
        candidato = base
        sufijo = 1
        while candidato in usados:
            sufijo += 1
            candidato = f'{base}{sufijo}'
        usados.add(candidato)
        usuario.username = candidato
        usuario.save(update_fields=['username'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_alter_authusuario_created_at_and_more'),
    ]

    operations = [
        # 1. Se agrega sin restricción para poder rellenar las cuentas existentes
        migrations.AddField(
            model_name='usuario',
            name='username',
            field=models.CharField(max_length=30, null=True),
        ),
        migrations.RunPython(generar_usernames, migrations.RunPython.noop),
        # 2. Ya con valores, se vuelve obligatorio y único
        migrations.AlterField(
            model_name='usuario',
            name='username',
            field=models.CharField(
                max_length=30,
                unique=True,
                validators=[
                    django.core.validators.RegexValidator(
                        '^[a-z0-9._]{3,30}$',
                        'Usa de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.',
                    )
                ],
            ),
        ),
    ]
