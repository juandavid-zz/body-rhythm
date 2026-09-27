from django.db import models
from users.models import Usuario


class PlanNutricional(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='planes_nutricionales',
        db_column='usuario_id',
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    calorias_diarias = models.FloatField(default=0)
    proteinas_g = models.FloatField(default=0)
    carbohidratos_g = models.FloatField(default=0)
    grasas_g = models.FloatField(default=0)
    generada_por_ia = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'planes_nutricionales'
        ordering = ['-created_at']

    def __str__(self):
        return f'Plan # {self.nombre}'


class Comida(models.Model):
    TIPOS = [
        ('desayuno', 'Desayuno'),
        ('almuerzo', 'Almuerzo'),
        ('cena', 'Cena'),
        ('snack', 'Snack'),
    ]

    plan = models.ForeignKey(
        PlanNutricional,
        on_delete=models.CASCADE,
        related_name='comidas',
    )
    tipo = models.CharField(max_length=20, choices=TIPOS)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    calorias = models.FloatField(default=0)
    proteinas_g = models.FloatField(default=0)
    carbohidratos_g = models.FloatField(default=0)
    grasas_g = models.FloatField(default=0)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'comidas'
        ordering = ['orden', 'id']

    def __str__(self):
        return self.nombre


class RegistroComida(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='registros_comida',
        db_column='usuario_id',
    )
    comida = models.ForeignKey(
        Comida,
        on_delete=models.CASCADE,
        related_name='registros',
        db_column='comida_id',
    )
    fecha = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'registro_comidas'
        ordering = ['-fecha', '-id']

    def __str__(self):
        return f'{self.usuario.nombre} comió {self.comida.nombre} el {self.fecha}'
