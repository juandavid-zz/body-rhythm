from django.core.management.base import BaseCommand
from nutricion.models import CategoriaAlimento, Alimento


CATALOGO = {
    'Proteínas': [
        ('Pechuga de pollo', 165, 31, 0, 3.6),
        ('Pollo cocido', 165, 31, 0, 3.6),
        ('Carne de res magra', 250, 26, 0, 15),
        ('Carne molida de res magra', 217, 26, 0, 12),
        ('Pavo', 135, 29, 0, 1.6),
        ('Lomo de cerdo', 143, 26, 0, 3.5),
        ('Atún en agua', 116, 26, 0, 0.8),
        ('Salmón', 208, 20, 0, 13),
        ('Sardinas', 208, 25, 0, 11),
        ('Camarones', 99, 24, 0.2, 0.3),
        ('Pulpo', 82, 15, 2.2, 1),
        ('Huevo entero', 143, 12.6, 0.7, 9.5),
        ('Claras de huevo', 52, 10.9, 0.7, 0.2),
        ('Tofu', 76, 8, 1.9, 4.8),
    ],
    'Cereales y granos': [
        ('Arroz blanco cocido', 130, 2.7, 28.2, 0.3),
        ('Arroz integral cocido', 123, 2.7, 25.6, 1),
        ('Avena', 389, 16.9, 66.3, 6.9),
        ('Quinoa cocida', 120, 4.4, 21.3, 1.9),
        ('Maíz cocido', 96, 3.4, 21, 1.5),
        ('Cuscús cocido', 112, 3.8, 23.2, 0.2),
    ],
    'Frutas': [
        ('Banano', 89, 1.1, 22.8, 0.3),
        ('Manzana', 52, 0.3, 13.8, 0.2),
        ('Naranja', 47, 0.9, 11.8, 0.1),
        ('Fresa', 32, 0.7, 7.7, 0.3),
        ('Mango', 60, 0.8, 15, 0.4),
        ('Piña', 50, 0.5, 13.1, 0.1),
        ('Papaya', 43, 0.5, 10.8, 0.3),
        ('Aguacate', 160, 2, 8.5, 14.7),
        ('Uvas', 69, 0.7, 18.1, 0.2),
        ('Arándanos', 57, 0.7, 14.5, 0.3),
        ('Sandía', 30, 0.6, 7.6, 0.2),
    ],
    'Verduras': [
        ('Papa cocida', 87, 1.9, 20.1, 0.1),
        ('Batata cocida', 76, 1.4, 17.7, 0.1),
        ('Brócoli', 35, 2.4, 7.2, 0.4),
        ('Espinaca', 23, 2.9, 3.6, 0.4),
        ('Zanahoria', 41, 0.9, 9.6, 0.2),
        ('Tomate', 18, 0.9, 3.9, 0.2),
        ('Pepino', 15, 0.7, 3.6, 0.1),
        ('Lechuga', 15, 1.4, 2.9, 0.2),
        ('Cebolla', 40, 1.1, 9.3, 0.1),
        ('Pimentón', 31, 1, 6, 0.3),
    ],
    'Legumbres': [
        ('Lentejas cocidas', 116, 9, 20.1, 0.4),
        ('Frijoles cocidos', 127, 8.7, 22.8, 0.5),
        ('Garbanzos cocidos', 164, 8.9, 27.4, 2.6),
        ('Arvejas cocidas', 84, 5.4, 15.6, 0.4),
    ],
    'Lácteos': [
        ('Leche entera', 61, 3.2, 4.8, 3.3),
        ('Leche descremada', 34, 3.4, 5, 0.1),
        ('Yogur natural', 61, 3.5, 4.7, 3.3),
        ('Yogur griego natural', 97, 9, 3.9, 5),
        ('Queso mozzarella', 280, 28, 3.1, 17),
        ('Queso fresco', 264, 18, 3.3, 20),
    ],
    'Frutos secos y semillas': [
        ('Almendras', 579, 21.2, 21.6, 49.9),
        ('Nueces', 654, 15.2, 13.7, 65.2),
        ('Maní', 567, 25.8, 16.1, 49.2),
        ('Semillas de chía', 486, 16.5, 42.1, 30.7),
        ('Semillas de linaza', 534, 18.3, 28.9, 42.2),
    ],
    'Panes y harinas': [
        ('Pan integral', 247, 13, 41, 4.2),
        ('Pan blanco', 266, 8.9, 49.4, 3.2),
        ('Arepa de maíz', 218, 5.5, 46, 1.5),
        ('Tortilla de maíz', 218, 5.7, 44.6, 2.9),
        ('Pasta cocida', 158, 5.8, 30.9, 0.9),
    ],
    'Bebidas': [
        ('Agua', 0, 0, 0, 0),
        ('Café negro sin azúcar', 2, 0.3, 0, 0),
        ('Té sin azúcar', 1, 0, 0.2, 0),
        ('Jugo de naranja', 45, 0.7, 10.4, 0.2),
    ],
    'Snacks': [
        ('Palomitas de maíz', 387, 12.9, 77.8, 4.5),
        ('Galletas integrales', 450, 8, 65, 17),
        ('Hummus', 166, 7.9, 14.3, 9.6),
    ],
    'Postres': [
        ('Chocolate negro', 598, 7.8, 45.9, 42.6),
        ('Helado de vainilla', 207, 3.5, 23.6, 11),
    ],
}


class Command(BaseCommand):
    help = 'Carga un catálogo general inicial de alimentos y sus valores nutricionales por 100 g.'

    def handle(self, *args, **options):
        categorias_creadas = 0
        alimentos_creados = 0

        for nombre_categoria, alimentos in CATALOGO.items():
            categoria, creada = CategoriaAlimento.objects.get_or_create(nombre=nombre_categoria)
            categorias_creadas += int(creada)

            for nombre, kcal, proteina, carbohidratos, grasas in alimentos:
                _, creado = Alimento.objects.update_or_create(
                    nombre=nombre,
                    defaults={
                        'categoria': categoria,
                        'calorias_100g': kcal,
                        'proteinas_100g': proteina,
                        'carbohidratos_100g': carbohidratos,
                        'grasas_100g': grasas,
                        'activo': True,
                    },
                )
                alimentos_creados += int(creado)

        self.stdout.write(self.style.SUCCESS(
            f'Catálogo listo. Categorías nuevas: {categorias_creadas}. '
            f'Alimentos nuevos: {alimentos_creados}. Total alimentos: {Alimento.objects.count()}.'
        ))
