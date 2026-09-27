from django.db import migrations


CATALOGO = {
    "Proteínas": [
        ("Pechuga de pollo", 165, 31, 0, 3.6),
        ("Pollo cocido", 165, 31, 0, 3.6),
        ("Carne de res magra", 217, 26, 0, 12),
        ("Carne molida magra", 215, 26, 0, 12),
        ("Pavo", 135, 29, 0, 1.8),
        ("Atún", 132, 29, 0, 0.6),
        ("Salmón", 208, 20, 0, 13),
        ("Tilapia", 128, 26, 0, 2.7),
    ],

    "Huevos": [
        ("Huevo entero", 143, 12.6, 0.7, 9.5),
        ("Claras de huevo", 52, 10.9, 0.7, 0.2),
    ],

    "Cereales y granos": [
        ("Arroz blanco cocido", 130, 2.7, 28.2, 0.3),
        ("Arroz integral cocido", 123, 2.7, 25.6, 1),
        ("Avena", 389, 16.9, 66.3, 6.9),
        ("Quinoa cocida", 120, 4.4, 21.3, 1.9),
        ("Maíz", 86, 3.3, 18.7, 1.4),
    ],

    "Verduras": [
        ("Brócoli", 34, 2.8, 6.6, 0.4),
        ("Zanahoria", 41, 0.9, 9.6, 0.2),
        ("Espinaca", 23, 2.9, 3.6, 0.4),
        ("Tomate", 18, 0.9, 3.9, 0.2),
        ("Pepino", 15, 0.7, 3.6, 0.1),
        ("Lechuga", 15, 1.4, 2.9, 0.2),
        ("Pimentón", 31, 1, 6, 0.3),
        ("Cebolla", 40, 1.1, 9.3, 0.1),
        ("Calabacín", 17, 1.2, 3.1, 0.3),
    ],

    "Frutas": [
        ("Banano", 89, 1.1, 22.8, 0.3),
        ("Manzana", 52, 0.3, 13.8, 0.2),
        ("Naranja", 47, 0.9, 11.8, 0.1),
        ("Fresa", 32, 0.7, 7.7, 0.3),
        ("Mango", 60, 0.8, 15, 0.4),
        ("Piña", 50, 0.5, 13.1, 0.1),
        ("Papaya", 43, 0.5, 10.8, 0.3),
        ("Uvas", 69, 0.7, 18.1, 0.2),
        ("Aguacate", 160, 2, 8.5, 14.7),
    ],

    "Legumbres": [
        ("Lentejas cocidas", 116, 9, 20.1, 0.4),
        ("Frijoles cocidos", 127, 8.7, 22.8, 0.5),
        ("Garbanzos cocidos", 164, 8.9, 27.4, 2.6),
        ("Arvejas", 84, 5.4, 15.6, 0.4),
    ],

    "Lácteos": [
        ("Leche entera", 61, 3.2, 4.8, 3.3),
        ("Leche descremada", 34, 3.4, 5, 0.1),
        ("Yogur natural", 61, 3.5, 4.7, 3.3),
        ("Yogur griego", 97, 9, 3.9, 5),
        ("Queso mozzarella", 280, 28, 3.1, 17),
        ("Queso fresco", 264, 18, 6, 20),
    ],

    "Frutos secos y semillas": [
        ("Almendras", 579, 21.2, 21.6, 49.9),
        ("Nueces", 654, 15.2, 13.7, 65.2),
        ("Maní", 567, 25.8, 16.1, 49.2),
        ("Semillas de chía", 486, 16.5, 42.1, 30.7),
        ("Semillas de girasol", 584, 20.8, 20, 51.5),
    ],

    "Panes y harinas": [
        ("Pan integral", 247, 13, 41, 4.2),
        ("Pan blanco", 266, 8.9, 49.4, 3.2),
        ("Tortilla de maíz", 218, 5.7, 44.6, 2.9),
        ("Harina de trigo", 364, 10.3, 76.3, 1),
    ],

    "Pastas": [
        ("Pasta cocida", 157, 5.8, 30.9, 0.9),
        ("Pasta integral cocida", 149, 5.3, 31, 1.4),
    ],

    "Bebidas": [
        ("Agua", 0, 0, 0, 0),
        ("Café negro", 2, 0.3, 0, 0),
        ("Té sin azúcar", 1, 0, 0.2, 0),
        ("Agua de coco", 19, 0.7, 3.7, 0.2),
    ],

    "Snacks": [
        ("Palomitas de maíz", 387, 12.9, 77.8, 4.5),
        ("Yogur con fruta", 90, 4, 14, 2),
        ("Barra de cereal", 400, 8, 70, 10),
    ],

    "Postres": [
        ("Chocolate negro", 598, 7.8, 45.9, 42.6),
        ("Gelatina", 62, 1.2, 14, 0.1),
        ("Helado de vainilla", 207, 3.5, 23.6, 11),
    ],

    "Ensaladas": [
        ("Ensalada verde", 25, 1.2, 4.5, 0.3),
        ("Ensalada de tomate", 30, 1.2, 6, 0.3),
        ("Ensalada de frutas", 50, 0.7, 12, 0.2),
    ],

    "Pescados y mariscos": [
        ("Camarones", 99, 24, 0.2, 0.3),
        ("Merluza", 90, 18, 0, 1.5),
        ("Sardinas", 208, 25, 0, 11),
    ],

    "Platos preparados": [
        ("Arroz con pollo", 180, 10, 25, 5),
        ("Pasta con pollo", 190, 12, 25, 5),
        ("Sopa de verduras", 45, 2, 7, 1),
        ("Sopa de pollo", 75, 7, 5, 3),
    ],
}


def cargar_catalogo(apps, schema_editor):
    Categoria = apps.get_model("nutricion", "CategoriaAlimento")
    Alimento = apps.get_model("nutricion", "Alimento")

    for categoria_nombre, alimentos in CATALOGO.items():
        categoria, _ = Categoria.objects.get_or_create(
            nombre=categoria_nombre
        )

        for nombre, kcal, proteina, carbohidratos, grasas in alimentos:
            Alimento.objects.update_or_create(
                nombre=nombre,
                defaults={
                    "categoria": categoria,
                    "descripcion": "",
                    "calorias_100g": kcal,
                    "proteinas_100g": proteina,
                    "carbohidratos_100g": carbohidratos,
                    "grasas_100g": grasas,
                    "activo": True,
                },
            )


def eliminar_catalogo(apps, schema_editor):
    Categoria = apps.get_model("nutricion", "CategoriaAlimento")
    Categoria.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("nutricion", "0003_categoriaalimento_alimento_comida_alimento"),
    ]

    operations = [
        migrations.RunPython(
            cargar_catalogo,
            eliminar_catalogo,
        ),
    ]
