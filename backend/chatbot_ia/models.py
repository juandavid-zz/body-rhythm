from django.db import models
from users.models import Usuario


class ConversacionIa(models.Model):
    TIPOS = [
        ('rutina', 'Generación de rutina'),
        ('nutricion', 'Consulta de nutrición'),
        ('general', 'Consulta general'),
    ]
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        related_name='conversaciones_ia', db_column='usuario_id'
    )
    tipo = models.CharField(max_length=13, choices=TIPOS, null=True, blank=True)
    mensaje_usuario = models.TextField()
    respuesta_ia = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversaciones_ia'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.usuario} - {self.tipo} - {self.created_at}"
