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


class ChatIa(models.Model):
    """
    Una conversación del asistente tal como la muestra el frontend (mensajes,
    paso del flujo, rutina generada...), para verla desde cualquier dispositivo.
    """
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='chats_ia')
    # Id que le pone el frontend al crearla (ej. "chat_1730000000000")
    cliente_id = models.CharField(max_length=40)
    titulo = models.CharField(max_length=120, default='Nueva conversación')
    datos = models.JSONField(default=dict)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chats_ia'
        ordering = ['-actualizado']
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'cliente_id'], name='chat_ia_unico_por_usuario'),
        ]

    def __str__(self):
        return f"{self.usuario} - {self.titulo}"
