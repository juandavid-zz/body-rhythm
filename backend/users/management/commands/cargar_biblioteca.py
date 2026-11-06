"""Carga la biblioteca de 376 ejercicios si la base está vacía (primer despliegue).

En Render gratis no hay consola: corre en cada arranque y, si ya hay
ejercicios, no hace nada (así no pisa cambios hechos desde el admin).
"""
from django.core.management import BaseCommand, call_command

from users.models import Ejercicio


class Command(BaseCommand):
    help = 'Carga users/fixtures/ejercicios.json solo si todavía no hay ejercicios.'

    def handle(self, *args, **opciones):
        if Ejercicio.objects.exists():
            self.stdout.write('La biblioteca de ejercicios ya está cargada.')
            return
        call_command('loaddata', 'ejercicios', verbosity=0)
        self.stdout.write(self.style.SUCCESS(f'Biblioteca cargada: {Ejercicio.objects.count()} ejercicios.'))
