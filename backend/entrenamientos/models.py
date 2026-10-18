from django.db import models
from django.utils import timezone
from users.models import Usuario
from rutinas.models import Rutina, Ejercicio


class HistorialEntrenamiento(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuario_id'
    )

    rutina = models.ForeignKey(
        Rutina,
        on_delete=models.CASCADE,
        db_column='rutina_id'
    )

    fecha = models.DateTimeField(auto_now_add=True)

    duracion_minutos = models.IntegerField(
        null=True,
        blank=True
    )

    calorias_quemadas = models.FloatField(
        null=True,
        blank=True
    )

    completado = models.BooleanField(
        default=False
    )

    notas = models.TextField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'historial_entrenamientos'

    def __str__(self):
        return f"{self.usuario} - {self.rutina} - {self.fecha}"


class ProgresoEjercicio(models.Model):
    historial = models.ForeignKey(
        HistorialEntrenamiento,
        on_delete=models.CASCADE,
        related_name='progresos',
        db_column='historial_id'
    )

    ejercicio = models.ForeignKey(
        Ejercicio,
        on_delete=models.CASCADE,
        db_column='ejercicio_id'
    )

    series_realizadas = models.IntegerField(
        null=True,
        blank=True
    )

    repeticiones_realizadas = models.IntegerField(
        null=True,
        blank=True
    )

    peso_usado = models.FloatField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'progreso_ejercicios'

    def __str__(self):
        return f"{self.ejercicio.nombre} en {self.historial}"


class RegistroEntrenamiento(models.Model):
    """
    Entrenamiento terminado desde "Registrar entrenamiento".
    Guarda cada ejercicio con sus series (peso y repeticiones) en JSON:
    [{"nombre", "por_tiempo", "unidad_peso", "series": [{"tipo", "reps",
      "peso", "peso_kg", "duracion_segundos", "hecho"}]}]
    """

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='registros_entrenamiento'
    )
    nombre = models.CharField(max_length=150)
    fecha = models.DateTimeField(default=timezone.now)
    duracion_segundos = models.PositiveIntegerField(default=0)
    series_completadas = models.PositiveIntegerField(default=0)
    series_totales = models.PositiveIntegerField(default=0)
    volumen_kg = models.FloatField(default=0)
    ejercicios = models.JSONField(default=list, blank=True)

    # Récords personales logrados en este entrenamiento (ver records.py)
    records = models.JSONField(default=list, blank=True)

    # Si es False solo lo ve su dueño, aunque tenga seguidores
    compartido = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registros_entrenamiento'
        ordering = ['-fecha']
        verbose_name = 'Registro de entrenamiento'
        verbose_name_plural = 'Registros de entrenamiento'

    def __str__(self):
        return f"{self.usuario} - {self.nombre} - {self.fecha:%Y-%m-%d}"
