from django.db import models
from users.models import Usuario


class PlanNutricional(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        related_name='planes_nutricionales', db_column='usuario_id'
    )
    nombre = models.CharField(max_length=150, null=True, blank=True)
    descripcion = models.TextField(null=True, blank=True)
    calorias_diarias = models.FloatField(null=True, blank=True)
    proteinas_g = models.FloatField(null=True, blank=True)
    carbohidratos_g = models.FloatField(null=True, blank=True)
    grasas_g = models.FloatField(null=True, blank=True)
    generada_por_ia = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'planes_nutricionales'

    def __str__(self):
        return self.nombre or f"Plan #{self.id}"


class Comida(models.Model):
    TIPOS = [
        ('desayuno', 'Desayuno'),
        ('almuerzo', 'Almuerzo'),
        ('cena', 'Cena'),
        ('snack', 'Snack'),
    ]
    plan = models.ForeignKey(
        PlanNutricional, on_delete=models.CASCADE,
        related_name='comidas', db_column='plan_id'
    )
    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=8, choices=TIPOS, null=True, blank=True)
    descripcion = models.TextField(null=True, blank=True)
    calorias = models.FloatField(null=True, blank=True)
    proteinas_g = models.FloatField(null=True, blank=True)
    carbohidratos_g = models.FloatField(null=True, blank=True)
    grasas_g = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'comidas'

    def __str__(self):
        return self.nombre


class RegistroComida(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        related_name='registros_comida', db_column='usuario_id'
    )
    comida = models.ForeignKey(
        Comida, on_delete=models.CASCADE, db_column='comida_id'
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registro_comidas'

    def __str__(self):
        return f"{self.usuario} comió {self.comida} el {self.fecha}"
