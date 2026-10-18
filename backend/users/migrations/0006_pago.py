from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_alter_authusuario_id_alter_recuperacionpassword_id_and_more'),
    ]

    # El modelo Pago ya se crea en 0005; aquí solo se cambia su id a BigAutoField.
    operations = [
        migrations.AlterField(
            model_name='pago',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
