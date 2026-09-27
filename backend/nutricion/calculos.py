"""Cálculo del objetivo nutricional (calorías y macros) de cada usuario.

Se usa la fórmula de Mifflin-St Jeor para el metabolismo basal (BMR),
se multiplica por un factor de actividad (moderado, pensado para alguien
que entrena con Body Rhythm) y se ajusta según la meta del usuario.
"""
from datetime import date

# Valores por defecto cuando el usuario aún no completó su perfil.
PESO_KG_DEFECTO = 70
ALTURA_CM_DEFECTO = 170
EDAD_DEFECTO = 30

# Actividad moderada: entrena varias veces por semana.
FACTOR_ACTIVIDAD = 1.55

# Ajuste de calorías totales (sobre el gasto calórico diario) según la meta.
AJUSTE_CALORIAS_POR_META = {
    'perder_peso': 0.82,           # déficit ~18%
    'ganar_musculo': 1.15,         # superávit ~15%
    'mejorar_resistencia': 1.05,   # ligero superávit para rendir
    'mantenerse': 1.0,
}

# Gramos de proteína por kg de peso corporal, según la meta.
PROTEINA_G_POR_KG_META = {
    'perder_peso': 2.0,          # cuida el músculo en déficit
    'ganar_musculo': 2.2,
    'mejorar_resistencia': 1.6,
    'mantenerse': 1.8,
}

PORCENTAJE_GRASAS_DEFECTO = 0.25  # % de las calorías totales

# Reparto de calorías entre los tipos de comida del día.
REPARTO_CALORIAS_POR_COMIDA = {
    'desayuno': 0.25,
    'almuerzo': 0.35,
    'cena': 0.30,
    'snack': 0.10,
}


def _altura_en_cm(altura):
    """Normaliza la altura: algunos registros la guardan en metros (1.75)
    y otros en centímetros (175). Si es menor a 3, se asume metros."""
    if not altura:
        return ALTURA_CM_DEFECTO
    return altura * 100 if altura < 3 else altura


def _calcular_edad(fecha_nacimiento):
    if not fecha_nacimiento:
        return EDAD_DEFECTO
    hoy = date.today()
    edad = hoy.year - fecha_nacimiento.year
    if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        edad -= 1
    return max(edad, 15)


def calcular_objetivo_nutricional(usuario):
    """Devuelve el objetivo diario de calorías y macros del usuario.

    Si al usuario le faltan datos del perfil (peso, altura, etc.) se usan
    valores de referencia y se avisa con 'datos_completos': False, para
    que el frontend pueda invitarlo a completar su perfil.
    """
    peso = usuario.peso or PESO_KG_DEFECTO
    altura_cm = _altura_en_cm(usuario.altura)
    edad = _calcular_edad(usuario.fecha_nacimiento)
    genero = usuario.genero or 'otro'
    meta = usuario.meta or 'mantenerse'

    datos_completos = bool(
        usuario.peso and usuario.altura
        and usuario.fecha_nacimiento and usuario.genero and usuario.meta
    )

    # Mifflin-St Jeor
    base = 10 * peso + 6.25 * altura_cm - 5 * edad
    if genero == 'masculino':
        bmr = base + 5
    elif genero == 'femenino':
        bmr = base - 161
    else:
        bmr = base - 78  # promedio entre ambas fórmulas

    gasto_diario = bmr * FACTOR_ACTIVIDAD
    calorias = gasto_diario * AJUSTE_CALORIAS_POR_META.get(meta, 1.0)

    proteinas_g = peso * PROTEINA_G_POR_KG_META.get(meta, 1.8)
    calorias_proteina = proteinas_g * 4

    calorias_grasas = calorias * PORCENTAJE_GRASAS_DEFECTO
    grasas_g = calorias_grasas / 9

    calorias_restantes = max(calorias - calorias_proteina - calorias_grasas, 0)
    carbohidratos_g = calorias_restantes / 4

    return {
        'calorias': round(calorias),
        'proteinas_g': round(proteinas_g),
        'carbohidratos_g': round(carbohidratos_g),
        'grasas_g': round(grasas_g),
        'meta': meta,
        'datos_completos': datos_completos,
    }


def calorias_para_comida(objetivo, tipo):
    """Cuántas calorías le corresponden a un tipo de comida (desayuno,
    almuerzo, cena, snack) dentro del objetivo diario del usuario."""
    return objetivo['calorias'] * REPARTO_CALORIAS_POR_COMIDA.get(tipo, 0.2)
