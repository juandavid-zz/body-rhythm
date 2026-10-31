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


class Notificacion(models.Model):
    """Aviso para un usuario: alguien le dio fuerza, comentó, lo mencionó o lo siguió."""

    FUERZA = 'fuerza'
    COMENTARIO = 'comentario'
    MENCION = 'mencion'
    SEGUIDOR = 'seguidor'
    SOLICITUD = 'solicitud'
    SOLICITUD_ACEPTADA = 'solicitud_aceptada'
    TIPOS = [
        (FUERZA, 'Te dio fuerza'),
        (COMENTARIO, 'Comentó tu entrenamiento'),
        (MENCION, 'Te mencionó'),
        (SEGUIDOR, 'Empezó a seguirte'),
        (SOLICITUD, 'Quiere seguirte'),
        (SOLICITUD_ACEPTADA, 'Aceptó tu solicitud'),
    ]

    destinatario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones',
        verbose_name='Para'
    )
    actor = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones_generadas',
        verbose_name='Quién'
    )
    tipo = models.CharField('Tipo', max_length=20, choices=TIPOS)
    registro = models.ForeignKey(
        'entrenamientos.RegistroEntrenamiento',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones',
        verbose_name='Entrenamiento'
    )
    comentario = models.ForeignKey(
        Comentario,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones',
        verbose_name='Comentario'
    )
    leida = models.BooleanField('Leída', default=False)
    created_at = models.DateTimeField('Fecha', auto_now_add=True)

    class Meta:
        db_table = 'social_notificaciones'
        ordering = ['-created_at']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [
            models.Index(fields=['destinatario', 'leida']),
            models.Index(fields=['destinatario', '-created_at']),
        ]

    def __str__(self):
        return f"@{self.actor.username} → @{self.destinatario.username}: {self.tipo}"
