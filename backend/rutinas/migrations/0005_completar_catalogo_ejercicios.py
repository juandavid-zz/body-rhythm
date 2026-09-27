from django.db import migrations


EJERCICIOS = [
    # PECHO
    ('Press inclinado con barra', 'pecho', 'Press inclinado para trabajar principalmente la zona superior del pecho.'),
    ('Press inclinado con mancuernas', 'pecho', 'Press inclinado realizado con mancuernas.'),
    ('Press declinado con barra', 'pecho', 'Press declinado enfocado en la zona inferior del pecho.'),
    ('Press con mancuernas', 'pecho', 'Press horizontal realizado con mancuernas.'),
    ('Flexiones', 'pecho', 'Ejercicio con peso corporal para pecho, hombros y tríceps.'),
    ('Flexiones inclinadas', 'pecho', 'Variante de flexiones con las manos elevadas.'),
    ('Flexiones diamante', 'pecho', 'Flexiones con agarre cerrado.'),
    ('Aperturas con mancuernas', 'pecho', 'Ejercicio de aislamiento para el pecho.'),
    ('Cruce de poleas', 'pecho', 'Ejercicio de aislamiento para el pecho realizado con poleas.'),
    ('Press en máquina', 'pecho', 'Press de pecho realizado en máquina.'),
    ('Fondos para pecho', 'pecho', 'Fondos inclinando el torso para enfatizar el pecho.'),

    # ESPALDA
    ('Dominadas', 'espalda', 'Ejercicio de peso corporal para espalda y brazos.'),
    ('Dominadas asistidas', 'espalda', 'Dominadas realizadas con asistencia.'),
    ('Remo con barra', 'espalda', 'Ejercicio de tracción horizontal para espalda.'),
    ('Remo con mancuerna', 'espalda', 'Remo unilateral realizado con mancuerna.'),
    ('Remo en máquina', 'espalda', 'Remo horizontal realizado en máquina.'),
    ('Jalón al pecho', 'espalda', 'Ejercicio de polea enfocado en los dorsales.'),
    ('Jalón cerrado', 'espalda', 'Variante del jalón para trabajar la espalda.'),
    ('Pullover con mancuerna', 'espalda', 'Movimiento para dorsales y musculatura del torso.'),
    ('Pullover en polea', 'espalda', 'Ejercicio de aislamiento para dorsales.'),
    ('Remo sentado en polea', 'espalda', 'Remo sentado realizado con polea.'),
    ('Remo invertido', 'espalda', 'Ejercicio de tracción utilizando el peso corporal.'),

    # HOMBROS
    ('Press militar', 'hombros', 'Press vertical para desarrollar los hombros.'),
    ('Press de hombros con mancuernas', 'hombros', 'Press vertical realizado con mancuernas.'),
    ('Press Arnold', 'hombros', 'Variante de press de hombros con rotación.'),
    ('Elevaciones laterales', 'hombros', 'Ejercicio para la zona lateral de los hombros.'),
    ('Elevaciones frontales', 'hombros', 'Ejercicio para la zona frontal de los hombros.'),
    ('Pájaros con mancuernas', 'hombros', 'Ejercicio para la zona posterior de los hombros.'),
    ('Face pull', 'hombros', 'Ejercicio con polea para hombros posteriores.'),
    ('Elevaciones laterales en polea', 'hombros', 'Elevación lateral utilizando polea.'),

    # BÍCEPS
    ('Curl de bíceps con barra', 'biceps', 'Curl básico para trabajar los bíceps.'),
    ('Curl con mancuernas', 'biceps', 'Curl de bíceps realizado con mancuernas.'),
    ('Curl martillo', 'biceps', 'Curl con agarre neutro para bíceps y braquial.'),
    ('Curl concentrado', 'biceps', 'Ejercicio unilateral de aislamiento para bíceps.'),
    ('Curl inclinado', 'biceps', 'Curl realizado sobre banco inclinado.'),
    ('Curl en polea', 'biceps', 'Curl de bíceps utilizando polea.'),
    ('Curl predicador', 'biceps', 'Curl realizado en banco predicador.'),

    # TRÍCEPS
    ('Fondos de tríceps', 'triceps', 'Ejercicio de empuje para tríceps.'),
    ('Extensión de tríceps en polea', 'triceps', 'Extensión de tríceps realizada en polea.'),
    ('Extensión de tríceps sobre la cabeza', 'triceps', 'Extensión para trabajar principalmente el tríceps.'),
    ('Press francés', 'triceps', 'Ejercicio de aislamiento para tríceps.'),
    ('Patada de tríceps', 'triceps', 'Ejercicio de aislamiento realizado con mancuerna.'),
    ('Extensión unilateral de tríceps', 'triceps', 'Extensión de tríceps realizada con un brazo.'),

    # ABDOMEN
    ('Crunch abdominal', 'abdomen', 'Ejercicio para trabajar principalmente el recto abdominal.'),
    ('Crunch bicicleta', 'abdomen', 'Ejercicio dinámico para abdomen y oblicuos.'),
    ('Plancha lateral', 'abdomen', 'Ejercicio isométrico para abdomen lateral.'),
    ('Elevaciones de piernas', 'abdomen', 'Ejercicio para abdomen y flexores de cadera.'),
    ('Elevaciones de rodillas', 'abdomen', 'Ejercicio para abdomen realizado elevando las rodillas.'),
    ('Mountain climbers', 'abdomen', 'Ejercicio dinámico para core y acondicionamiento.'),
    ('Dead bug', 'abdomen', 'Ejercicio de estabilidad y control del core.'),
    ('Russian twist', 'abdomen', 'Ejercicio dinámico para abdomen y oblicuos.'),
    ('Hollow body hold', 'abdomen', 'Ejercicio isométrico para el core.'),

    # CUÁDRICEPS
    ('Sentadilla', 'cuadriceps', 'Ejercicio compuesto para piernas y glúteos.'),
    ('Sentadilla goblet', 'cuadriceps', 'Sentadilla realizada sosteniendo una mancuerna.'),
    ('Sentadilla frontal', 'cuadriceps', 'Sentadilla con la carga en la parte frontal.'),
    ('Sentadilla hack', 'cuadriceps', 'Sentadilla realizada en máquina hack.'),
    ('Prensa de piernas', 'cuadriceps', 'Ejercicio de piernas realizado en máquina.'),
    ('Extensión de piernas', 'cuadriceps', 'Ejercicio de aislamiento para cuádriceps.'),
    ('Zancadas', 'cuadriceps', 'Ejercicio unilateral para piernas y glúteos.'),
    ('Zancadas caminando', 'cuadriceps', 'Variante dinámica de zancadas.'),
    ('Step up', 'cuadriceps', 'Subida a plataforma para trabajar piernas.'),

    # FEMORAL
    ('Peso muerto rumano', 'femoral', 'Ejercicio de cadena posterior con énfasis en femorales.'),
    ('Peso muerto piernas rígidas', 'femoral', 'Variante de peso muerto enfocada en femorales.'),
    ('Curl femoral', 'femoral', 'Ejercicio de aislamiento para femorales.'),
    ('Curl femoral sentado', 'femoral', 'Curl femoral realizado en máquina sentado.'),
    ('Curl femoral acostado', 'femoral', 'Curl femoral realizado acostado.'),
    ('Buenos días', 'femoral', 'Ejercicio de bisagra de cadera para cadena posterior.'),

    # GLÚTEOS
    ('Hip thrust', 'gluteos', 'Ejercicio de extensión de cadera con énfasis en glúteos.'),
    ('Puente de glúteos', 'gluteos', 'Extensión de cadera realizada en el suelo.'),
    ('Patada de glúteo', 'gluteos', 'Ejercicio de aislamiento para glúteos.'),
    ('Abducción de cadera', 'gluteos', 'Ejercicio para glúteos medios.'),
    ('Sentadilla sumo', 'gluteos', 'Sentadilla con postura amplia para piernas y glúteos.'),
    ('Peso muerto sumo', 'gluteos', 'Peso muerto con postura amplia.'),
    ('Hip thrust unilateral', 'gluteos', 'Variante unilateral del hip thrust.'),

    # PANTORRILLAS
    ('Elevación de talones de pie', 'pantorrillas', 'Ejercicio básico para pantorrillas.'),
    ('Elevación de talones sentado', 'pantorrillas', 'Ejercicio de pantorrillas realizado sentado.'),
    ('Elevación de talones en prensa', 'pantorrillas', 'Elevación de talones utilizando prensa.'),
    ('Elevación unilateral de talón', 'pantorrillas', 'Ejercicio unilateral para pantorrillas.'),

    # CARDIO
    ('Caminata', 'cardio', 'Actividad cardiovascular de bajo impacto.'),
    ('Caminata rápida', 'cardio', 'Caminata realizada a mayor intensidad.'),
    ('Correr', 'cardio', 'Actividad cardiovascular de mayor intensidad.'),
    ('Bicicleta', 'cardio', 'Actividad cardiovascular realizada en bicicleta.'),
    ('Bicicleta estática', 'cardio', 'Ejercicio cardiovascular en bicicleta estacionaria.'),
    ('Elíptica', 'cardio', 'Ejercicio cardiovascular de bajo impacto.'),
    ('Saltar la cuerda', 'cardio', 'Ejercicio cardiovascular realizado con cuerda.'),
    ('Jumping jacks', 'cardio', 'Ejercicio cardiovascular dinámico.'),
    ('Burpees', 'cardio', 'Ejercicio de alta intensidad de cuerpo completo.'),
    ('Escaladora', 'cardio', 'Ejercicio cardiovascular realizado en máquina escaladora.'),

    # CUERPO COMPLETO
    ('Sentadilla con press', 'cuerpo_completo', 'Combinación de sentadilla y press.'),
    ('Thruster', 'cuerpo_completo', 'Combinación de sentadilla y press de hombros.'),
    ('Swing con kettlebell', 'cuerpo_completo', 'Movimiento dinámico de cadena posterior.'),
    ('Bear crawl', 'cuerpo_completo', 'Desplazamiento que trabaja core y cuerpo completo.'),
    ('Turkish get-up', 'cuerpo_completo', 'Movimiento de estabilidad, movilidad y fuerza.'),
    ('Clean con kettlebell', 'cuerpo_completo', 'Movimiento de cuerpo completo utilizando kettlebell.'),
]


def cargar_catalogo(apps, schema_editor):
    Ejercicio = apps.get_model('rutinas', 'Ejercicio')

    for nombre, grupo, descripcion in EJERCICIOS:
        Ejercicio.objects.get_or_create(
            nombre=nombre,
            defaults={
                'descripcion': descripcion,
                'grupo_muscular': grupo,
                'imagen_url': '',
                'video_url': '',
            },
        )


def revertir_catalogo(apps, schema_editor):
    Ejercicio = apps.get_model('rutinas', 'Ejercicio')

    nombres = [nombre for nombre, _, _ in EJERCICIOS]

    Ejercicio.objects.filter(nombre__in=nombres).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('rutinas', '0004_cargar_catalogo_ejercicios'),
    ]

    operations = [
        migrations.RunPython(
            cargar_catalogo,
            revertir_catalogo,
        ),
    ]