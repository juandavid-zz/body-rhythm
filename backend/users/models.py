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
    auth = models.ForeignKey(AuthUsuario, on_delete=models.CASCADE, db_column='auth_id')
    codigo = models.CharField(max_length=10)
    expira_at = models.DateTimeField()
    usado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recuperacion_password'


class Sesion(models.Model):
    auth = models.ForeignKey(AuthUsuario, on_delete=models.CASCADE, db_column='auth_id')
    token = models.CharField(max_length=255)
    dispositivo = models.CharField(max_length=150, null=True, blank=True)
    ip = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expira_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sesiones'
