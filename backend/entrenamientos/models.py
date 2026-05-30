from django.db import models
from users.models import Usuario


class Rutina(models.Model):
    NIVELES = [
        ('principiante', 'Principiante'),
        ('intermedio', 'Intermedio'),
        ('avanzado', 'Avanzado'),
    ]
    OBJETIVOS = [
        ('perder_peso', 'Perder Peso'),
        ('ganar_musculo', 'Ganar Músculo'),
        ('mantenerse', 'Mantenerse'),
        ('mejorar_resistencia', 'Mejorar Resistencia'),
    ]

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        null=True, blank=True, db_column='usuario_id'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(null=True, blank=True)
    nivel = models.CharField(max_length=20, choices=NIVELES, null=True, blank=True)
    objetivo = models.CharField(max_length=30, choices=OBJETIVOS, null=True, blank=True)
    imc_referencia = models.FloatField(null=True, blank=True)
    generada_por_ia = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    rango_imc = models.CharField(max_length=20, null=True, blank=True)
    dias_por_semana = models.IntegerField(default=3)
    duracion_minutos = models.IntegerField(default=45)

    class Meta:
        db_table = 'rutinas'

    def __str__(self):
        return f"{self.nombre} | {self.objetivo} | {self.rango_imc}"


class Ejercicio(models.Model):
    rutina = models.ForeignKey(
        Rutina, on_delete=models.CASCADE,
        related_name='ejercicios', db_column='rutina_id'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(null=True, blank=True)
    series = models.IntegerField(null=True, blank=True)
    repeticiones = models.IntegerField(null=True, blank=True)
    duracion_segundos = models.IntegerField(null=True, blank=True)
    descanso_segundos = models.IntegerField(null=True, blank=True)
    orden = models.IntegerField(null=True, blank=True)
    grupo_muscular = models.CharField(max_length=30, null=True, blank=True)
    nivel = models.CharField(max_length=20, null=True, blank=True)
    dia = models.CharField(max_length=15, null=True, blank=True)

    class Meta:
        db_table = 'ejercicios'
        ordering = ['dia', 'orden']

    def __str__(self):
        return f"{self.nombre}"


class HistorialEntrenamiento(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, db_column='usuario_id'
    )
    rutina = models.ForeignKey(
        Rutina, on_delete=models.CASCADE, db_column='rutina_id'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    duracion_minutos = models.IntegerField(null=True, blank=True)
    calorias_quemadas = models.FloatField(null=True, blank=True)
    completado = models.BooleanField(default=False)
    notas = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'historial_entrenamientos'