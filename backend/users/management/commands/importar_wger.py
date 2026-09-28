import json
import re
import urllib.request

from django.core.management.base import BaseCommand
from users.models import Ejercicio


WGER_URL = "https://wger.de/api/v2/exerciseinfo/?limit=100"


class Command(BaseCommand):
    help = "Importa ejercicios desde la API de WGER"

    def obtener_datos(self, url):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:
            self.stdout.write(
                self.style.ERROR(f"Error al consultar WGER: {error}")
            )
            return None

    def buscar_traduccion(self, traducciones):
        # Español
        for traduccion in traducciones:
            if traduccion.get("language") == 7:
                return traduccion

        # Inglés
        for traduccion in traducciones:
            if traduccion.get("language") == 2:
                return traduccion

        # Cualquier idioma disponible
        if traducciones:
            return traducciones[0]

        return None

    def limpiar_descripcion(self, descripcion):
        if not descripcion:
            return ""

        descripcion = re.sub(r"<[^>]+>", "", descripcion)
        descripcion = descripcion.replace("&nbsp;", " ")

        return descripcion.strip()

    def handle(self, *args, **options):

        url = WGER_URL

        total_procesados = 0
        nuevos = 0
        actualizados = 0

        self.stdout.write(
            self.style.SUCCESS(
                "Iniciando importación de ejercicios desde WGER..."
            )
        )

        while url:

            data = self.obtener_datos(url)

            if not data:
                break

            resultados = data.get("results", [])

            for ejercicio_data in resultados:

                wger_id = ejercicio_data.get("id")

                traduccion = self.buscar_traduccion(
                    ejercicio_data.get("translations", [])
                )

                if not traduccion:
                    continue

                nombre = traduccion.get("name", "").strip()

                if not nombre:
                    continue

                categoria = ejercicio_data.get("category") or {}

                grupo = categoria.get("name", "Otros")

                musculos_principales = [
                    musculo.get("name_en") or musculo.get("name")
                    for musculo in ejercicio_data.get("muscles", [])
                ]

                musculos_secundarios = [
                    musculo.get("name_en") or musculo.get("name")
                    for musculo in ejercicio_data.get(
                        "muscles_secondary", []
                    )
                ]

                equipamiento = [
                    equipo.get("name")
                    for equipo in ejercicio_data.get("equipment", [])
                ]

                imagenes = ejercicio_data.get("images", [])

                imagen = ""

                if imagenes:
                    imagen = imagenes[0].get("image", "")

                descripcion = self.limpiar_descripcion(
                    traduccion.get("description", "")
                )

                videos = [
                    video.get("video")
                    for video in ejercicio_data.get("videos", [])
                    if video.get("video")
                ]

                ejercicio, creado = Ejercicio.objects.update_or_create(
                    wger_id=wger_id,
                    defaults={
                        "nombre": nombre,
                        "grupo": grupo,
                        "musculos_principales": musculos_principales,
                        "musculos_secundarios": musculos_secundarios,
                        "equipamiento": equipamiento,
                        "descripcion": descripcion,
                        "imagen": imagen,
                        "videos": videos,
                    },
                )

                total_procesados += 1

                if creado:
                    nuevos += 1
                    accion = "NUEVO"
                else:
                    actualizados += 1
                    accion = "ACTUALIZADO"

                self.stdout.write(
                    f"[{total_procesados}] {accion}: {nombre}"
                )

            url = data.get("next")

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS("Importación completada.")
        )

        self.stdout.write(
            f"Ejercicios procesados: {total_procesados}"
        )

        self.stdout.write(
            f"Ejercicios nuevos: {nuevos}"
        )

        self.stdout.write(
            f"Ejercicios actualizados: {actualizados}"
        )