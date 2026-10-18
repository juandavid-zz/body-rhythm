from django.db import models
from django.db.models import F, Q

from users.models import Usuario


class Seguimiento(models.Model):
    """
    Relación "A sigue a B" con aprobación (como una cuenta privada):
    nace como pendiente y B la acepta o la rechaza.
    Solo los seguidores aceptados ven los entrenamientos de B.
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
