from django.db import models
from django.db.models import F, Q

from users.models import Usuario


class Seguimiento(models.Model):
    """
    Relación "A sigue a B". Si la cuenta de B es pública, nace aceptada;
    si es privada, nace pendiente y B la acepta o la rechaza.
    """

    PENDIENTE = 'pendiente'
    ACEPTADO = 'aceptado'
    ESTADOS = [
        (PENDIENTE, 'Pendiente'),
        (ACEPTADO, 'Aceptado'),
    ]

    seguidor = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='seguimientos_enviados',
        verbose_name='Seguidor'
    )
    seguido = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='seguimientos_recibidos',
        verbose_name='Seguido'
    )
    estado = models.CharField('Estado', max_length=10, choices=ESTADOS, default=PENDIENTE)
    created_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    aceptado_at = models.DateTimeField('Fecha de aceptación', null=True, blank=True)

    class Meta:
        db_table = 'social_seguimientos'
        verbose_name = 'Seguimiento'
        verbose_name_plural = 'Seguimientos'
        constraints = [
            models.UniqueConstraint(fields=['seguidor', 'seguido'], name='seguimiento_unico'),
            models.CheckConstraint(check=~Q(seguidor=F('seguido')), name='no_seguirse_a_si_mismo'),
        ]
        indexes = [
            models.Index(fields=['seguido', 'estado']),
            models.Index(fields=['seguidor', 'estado']),
        ]

    def __str__(self):
        return f"@{self.seguidor.username} → @{self.seguido.username} ({self.estado})"


class Fuerza(models.Model):
    """Dar «fuerza» a un entrenamiento (como los kudos de Strava). Una por usuario."""

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='fuerzas_dadas',
        verbose_name='Usuario'
    )
    registro = models.ForeignKey(
        'entrenamientos.RegistroEntrenamiento',
        on_delete=models.CASCADE,
        related_name='fuerzas',
        verbose_name='Entrenamiento'
    )
    created_at = models.DateTimeField('Fecha', auto_now_add=True)

    class Meta:
        db_table = 'social_fuerzas'
        verbose_name = 'Fuerza'
        verbose_name_plural = 'Fuerzas'
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'registro'], name='fuerza_unica'),
        ]

    def __str__(self):
        return f"@{self.usuario.username} 💪 {self.registro}"


class Comentario(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='comentarios',
        verbose_name='Usuario'
    )
    registro = models.ForeignKey(
        'entrenamientos.RegistroEntrenamiento',
        on_delete=models.CASCADE,
        related_name='comentarios',
        verbose_name='Entrenamiento'
    )
    texto = models.CharField('Comentario', max_length=500)
    created_at = models.DateTimeField('Fecha', auto_now_add=True)

    class Meta:
        db_table = 'social_comentarios'
        ordering = ['created_at']
        verbose_name = 'Comentario'
        verbose_name_plural = 'Comentarios'

    def __str__(self):
        return f"@{self.usuario.username}: {self.texto[:40]}"
