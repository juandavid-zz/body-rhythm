from django.db import models
from users.models import Usuario

class Ejercicio(models.Model):
    GRUPOS_MUSCULARES = [
        ('pecho', 'Pecho'),
        ('espalda', 'Espalda'),
        ('hombros', 'Hombros'),
        ('biceps', 'Bíceps'),
        ('triceps', 'Tríceps'),
        ('abdomen', 'Abdomen'),
        ('cuadriceps', 'Cuádriceps'),
        ('femoral', 'Femoral'),
        ('gluteos', 'Glúteos'),
        ('pantorrillas', 'Pantorrillas'),
        ('cardio', 'Cardio'),
        ('cuerpo_completo', 'Cuerpo Completo'),
    ]

    nombre = models.CharField('Nombre', max_length=100)
    descripcion = models.TextField('Descripción', blank=True)
    grupo_muscular = models.CharField('Grupo muscular', max_length=30, choices=GRUPOS_MUSCULARES)
    imagen_url = models.URLField('URL de la imagen', blank=True, null=True)
    video_url = models.URLField('URL del vídeo', blank=True, null=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)

    class Meta:
        db_table = 'rutinas_ejercicios'
        verbose_name = 'Ejercicio'
        verbose_name_plural = 'Ejercicios'

    def __str__(self):
        return f"{self.nombre} ({self.get_grupo_muscular_display()})"


class Rutina(models.Model):

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='rutinas', verbose_name='Usuario'
    )
    nombre = models.CharField('Nombre', max_length=100)
    descripcion = models.TextField('Descripción', blank=True)
    ejercicios = models.ManyToManyField(
        Ejercicio, through='RutinaEjercicio', blank=True, verbose_name='Ejercicios'
    )
    es_favorita = models.BooleanField('Es favorita', default=False)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)

    class Meta:
        db_table = 'rutinas_rutinas'
        verbose_name = 'Rutina'
        verbose_name_plural = 'Rutinas'

    def __str__(self):
        return f"{self.nombre} - {self.usuario.nombre}"


class RutinaEjercicio(models.Model):
    rutina = models.ForeignKey(Rutina, on_delete=models.CASCADE, verbose_name='Rutina')
    ejercicio = models.ForeignKey(Ejercicio, on_delete=models.CASCADE, verbose_name='Ejercicio')
    series = models.IntegerField('Series', default=3)
    repeticiones = models.IntegerField('Repeticiones', default=10)
    descanso_segundos = models.IntegerField('Descanso (segundos)', default=60)
    orden = models.IntegerField('Orden', default=0)

    class Meta:
        db_table = 'rutina_ejercicios'
        verbose_name = 'Ejercicio de la rutina'
        verbose_name_plural = 'Ejercicios de la rutina'
        ordering = ['orden']

    def __str__(self):
        return f"{self.rutina.nombre} → {self.ejercicio.nombre}"