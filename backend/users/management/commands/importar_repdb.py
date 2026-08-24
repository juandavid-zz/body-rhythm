import json
from pathlib import Path

from django.core.management.base import BaseCommand

from users.models import Ejercicio


class Command(BaseCommand):
    help = "Importa ejercicios completos desde RepDB en español"

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[3]
        json_path = base_dir / "repdb" / "free.es.json"

        if not json_path.exists():
            self.stdout.write(
                self.style.ERROR(
                    f"No se encontró el archivo: {json_path}"
                )
            )
            return

        with open(json_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        ejercicios = data.get("exercises", [])

        self.stdout.write(
            self.style.NOTICE(
                f"Ejercicios encontrados en RepDB: {len(ejercicios)}"
            )
        )

        importados = 0
        omitidos = 0

        for ejercicio in ejercicios:
            nombre = ejercicio.get("name")
            descripcion = ejercicio.get("description")
            grupo = ejercicio.get("body_part")
            principales = ejercicio.get("primary_muscles", [])
            secundarios = ejercicio.get("secondary_muscles", [])
            imagenes = ejercicio.get("images", {}).get("flat", [])

            completo = (
                nombre
                and descripcion
                and grupo
                and principales
                and secundarios
                and imagenes
            )

            if not completo:
                omitidos += 1
                continue

            repdb_id = ejercicio.get("id")

            if len(imagenes) >= 2:
                imagen_inicio = f"/ejercicios/{repdb_id}-start.webp"
                imagen_final = f"/ejercicios/{repdb_id}-peak.webp"
            else:
                imagen_inicio = f"/ejercicios/{repdb_id}-{imagenes[0]}.webp"
                imagen_final = imagen_inicio

            Ejercicio.objects.update_or_create(
                repdb_id=repdb_id,
                defaults={
                    "nombre": nombre,
                    "grupo": grupo,
                    "musculos_principales": principales,
                    "musculos_secundarios": secundarios,
                    "descripcion": descripcion,
                    "imagen_inicio": imagen_inicio,
                    "imagen_final": imagen_final,
                },
            )

            importados += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Ejercicios importados/actualizados: {importados}"
            )
        )

        self.stdout.write(
            self.style.WARNING(
                f"Ejercicios omitidos por información incompleta: {omitidos}"
            )
        )