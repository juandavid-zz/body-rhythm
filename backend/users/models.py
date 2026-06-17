from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class AuthUsuarioManager(BaseUserManager):
    def create_user(self, email, password=None):
        if not email:
            raise ValueError('El usuario debe tener un email')
        user = self.model(email=self.normalize_email(email))
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None):
        user = self.create_user(email, password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(using=self._db)
        return user


class AuthUsuario(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255, blank=True)
    token = models.CharField(max_length=255, null=True, blank=True)
    token_expira = models.DateTimeField(null=True, blank=True)
    verificado = models.BooleanField(default=False)
    codigo_verificacion = models.CharField(max_length=10, null=True, blank=True)
    intentos_fallidos = models.IntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    ultimo_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = AuthUsuarioManager()

    class Meta:
        db_table = 'auth_usuarios'

    def __str__(self):
        return self.email


class Usuario(models.Model):
    auth = models.OneToOneField(AuthUsuario, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    peso = models.FloatField(null=True, blank=True)
    altura = models.FloatField(null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=10, choices=[
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('otro', 'Otro')
    ], null=True, blank=True)
    meta = models.CharField(max_length=30, choices=[
        ('perder_peso', 'Perder Peso'),
        ('ganar_musculo', 'Ganar Músculo'),
        ('mantenerse', 'Mantenerse'),
        ('mejorar_resistencia', 'Mejorar Resistencia')
    ], null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usuarios'

    def __str__(self):
        return self.nombre