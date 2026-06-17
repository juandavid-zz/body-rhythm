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

    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    grupo_muscular = models.CharField(max_length=30, choices=GRUPOS_MUSCULARES)
    imagen_url = models.URLField(blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ejercicios'

    def __str__(self):
        return f"{self.nombre} ({self.get_grupo_muscular_display()})"


class Rutina(models.Model):
    NIVELES = [
        ('principiante', 'Principiante'),
        ('intermedio', 'Intermedio'),
        ('avanzado', 'Avanzado'),
    ]

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='rutinas'
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    nivel = models.CharField(max_length=20, choices=NIVELES, default='principiante')
    ejercicios = models.ManyToManyField(
        Ejercicio, through='RutinaEjercicio', blank=True
    )
    es_favorita = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rutinas'

    def __str__(self):
        return f"{self.nombre} - {self.usuario.nombre}"


class RutinaEjercicio(models.Model):
    rutina = models.ForeignKey(Rutina, on_delete=models.CASCADE)
    ejercicio = models.ForeignKey(Ejercicio, on_delete=models.CASCADE)
    series = models.IntegerField(default=3)
    repeticiones = models.IntegerField(default=10)
    descanso_segundos = models.IntegerField(default=60)
    orden = models.IntegerField(default=0)

    class Meta:
        db_table = 'rutina_ejercicios'
        ordering = ['orden']

    def __str__(self):
        return f"{self.rutina.nombre} → {self.ejercicio.nombre}"