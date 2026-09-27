from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('nutricion', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE comidas
                ADD COLUMN orden INT UNSIGNED NOT NULL DEFAULT 0;
            """,
            reverse_sql="""
                ALTER TABLE comidas
                DROP COLUMN orden;
            """,
        ),
    ]
