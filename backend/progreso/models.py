from django.db import models
from users.models import Usuario


class ImcHistorial(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        related_name='imc_historial', db_column='usuario_id'
    )
    peso = models.FloatField()
    altura = models.FloatField()
    imc = models.FloatField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'imc_historial'

    def __str__(self):
        return f"{self.usuario} - IMC {self.imc} ({self.fecha.date()})"


class MedidaCorporal(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        related_name='medidas_corporales', db_column='usuario_id'
    )
    pecho = models.FloatField(null=True, blank=True)
    cintura = models.FloatField(null=True, blank=True)
    cadera = models.FloatField(null=True, blank=True)
    brazo_izquierdo = models.FloatField(null=True, blank=True)
    brazo_derecho = models.FloatField(null=True, blank=True)
    pierna_izquierda = models.FloatField(null=True, blank=True)
    pierna_derecha = models.FloatField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medidas_corporales'

    def __str__(self):
        return f"Medidas de {self.usuario} - {self.fecha.date()}"
