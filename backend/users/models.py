from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class AuthUsuarioManager(BaseUserManager):
    def create_user(self, email, password=None):
        user = self.model(email=email)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None):
        user = self.create_user(email, password)
        return user

class AuthUsuario(AbstractBaseUser):
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    token = models.CharField(max_length=255, null=True, blank=True)
    token_expira = models.DateTimeField(null=True, blank=True)
    verificado = models.BooleanField(default=False)
    codigo_verificacion = models.CharField(max_length=10, null=True, blank=True)
    intentos_fallidos = models.IntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    ultimo_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = AuthUsuarioManager()

    class Meta:
        db_table = 'auth_usuarios'


class Usuario(models.Model):
    auth = models.OneToOneField(AuthUsuario, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    peso = models.FloatField(null=True, blank=True)
    altura = models.FloatField(null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)

    genero = models.CharField(
        max_length=10,
        choices=[
            ('masculino', 'Masculino'),
            ('femenino', 'Femenino'),
            ('otro', 'Otro')
        ],
        null=True,
        blank=True
    )

    meta = models.CharField(
        max_length=30,
        choices=[
            ('perder_peso', 'Perder Peso'),
            ('ganar_musculo', 'Ganar Músculo'),
            ('mantenerse', 'Mantenerse'),
            ('mejorar_resistencia', 'Mejorar Resistencia')
        ],
        null=True,
        blank=True
    )

    plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('pro', 'Pro'),
            ('premium', 'Premium'),
        ],
        default='free'
    )

    fecha_inicio_plan = models.DateTimeField(
        null=True,
        blank=True
    )

    fecha_fin_plan = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usuarios'


class RecuperacionPassword(models.Model):
    auth = models.ForeignKey(
        AuthUsuario,
        on_delete=models.CASCADE,
        db_column='auth_id'
    )
    codigo = models.CharField(max_length=10)
    expira_at = models.DateTimeField()
    usado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recuperacion_password'


class Sesion(models.Model):
    auth = models.ForeignKey(
        AuthUsuario,
        on_delete=models.CASCADE,
        db_column='auth_id'
    )
    token = models.CharField(max_length=255)
    dispositivo = models.CharField(max_length=150, null=True, blank=True)
    ip = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expira_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sesiones'


class Pago(models.Model):
    PLAN_CHOICES = [
        ('pro', 'Pro'),
        ('premium', 'Premium'),
    ]

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    METODO_CHOICES = [
        ('tarjeta', 'Tarjeta'),
        ('pse', 'PSE'),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='usuario_id',
        related_name='pagos'
    )

    plan = models.CharField(
        max_length=50,
        choices=PLAN_CHOICES
    )

    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    referencia = models.CharField(
        max_length=100,
        unique=True
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente'
    )

    metodo = models.CharField(
        max_length=20,
        choices=METODO_CHOICES
    )

    fecha = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = 'pagos'


class Ejercicio(models.Model):
    repdb_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True
    )

    nombre = models.CharField(max_length=200)
    grupo = models.CharField(max_length=100)

    musculos_principales = models.JSONField(default=list, blank=True)
    musculos_secundarios = models.JSONField(default=list, blank=True)

    descripcion = models.TextField(blank=True)

    imagen_inicio = models.CharField(max_length=500, blank=True)
    imagen_final = models.CharField(max_length=500, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'biblioteca_ejercicios'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre