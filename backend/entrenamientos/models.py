from django.db import models
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
