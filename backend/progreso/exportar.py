"""Descarga de los datos del usuario en un Excel (.xlsx) con una hoja por tema."""
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

from .models import MedidaCorporal

TIPOS_SERIE = {'normal': 'Normal', 'calentamiento': 'Calentamiento', 'fallo': 'Al fallo', 'dropset': 'Drop set'}


def _hoja(libro, titulo, encabezados, filas, primera=False):
    hoja = libro.active if primera else libro.create_sheet()
    hoja.title = titulo
    hoja.append(encabezados)
    for celda in hoja[1]:
        celda.font = Font(bold=True, color='FFFFFF')
        celda.fill = PatternFill('solid', fgColor='7C3AED')
    for fila in filas:
        hoja.append(fila)
    hoja.freeze_panes = 'A2'
    # Ancho de columna según el texto más largo (con tope)
    for i, encabezado in enumerate(encabezados, start=1):
        largo = max([len(str(encabezado))] + [len(str(f[i - 1])) for f in filas if f[i - 1] is not None][:500])
        hoja.column_dimensions[get_column_letter(i)].width = min(45, largo + 2)
    return hoja


def _series(ejercicio):
    return ejercicio.get('series', ejercicio.get('sets')) or []


def _numero(valor):
    try:
        return round(float(valor), 2) if valor not in (None, '') else None
    except (TypeError, ValueError):
        return None


def libro_de_datos(usuario):
    """Arma el Excel con sesiones, series, peso, medidas y rutinas del usuario."""
    libro = Workbook()
    registros = list(usuario.registros_entrenamiento.order_by('fecha'))

    _hoja(libro, 'Sesiones', ['Fecha', 'Entrenamiento', 'Duración (min)', 'Series hechas', 'Series totales',
                               'Volumen (kg)', 'Récords'], [
        [r.fecha.replace(tzinfo=None), r.nombre, round(r.duracion_segundos / 60, 1), r.series_completadas,
         r.series_totales, round(r.volumen_kg or 0, 1), len(r.records or [])]
        for r in registros
    ], primera=True)

    filas = []
    for r in registros:
        for ejercicio in r.ejercicios or []:
            por_tiempo = ejercicio.get('por_tiempo', ejercicio.get('porTiempo', False))
            unidad = ejercicio.get('unidad_peso', ejercicio.get('unidadPeso')) or ('' if por_tiempo else 'kg')
            for numero, serie in enumerate(_series(ejercicio), start=1):
                filas.append([
                    r.fecha.replace(tzinfo=None), r.nombre, ejercicio.get('nombre'), numero,
                    TIPOS_SERIE.get(serie.get('tipo'), serie.get('tipo') or 'Normal'),
                    _numero(serie.get('reps')), _numero(serie.get('peso')), unidad if not por_tiempo else '',
                    _numero(serie.get('duracion_segundos', serie.get('duracion'))) if por_tiempo else None,
                    'Sí' if serie.get('hecho') else 'No',
                ])
    _hoja(libro, 'Series', ['Fecha', 'Entrenamiento', 'Ejercicio', 'Serie', 'Tipo', 'Reps', 'Peso', 'Unidad',
                            'Duración (s)', 'Hecha'], filas)

    _hoja(libro, 'Peso', ['Fecha', 'Peso (kg)', 'Altura', 'IMC'], [
        [h.fecha.replace(tzinfo=None), h.peso, h.altura, h.imc] for h in usuario.imc_historial.order_by('fecha')
    ])

    nombres = {
        'pecho': 'Pecho (cm)', 'cintura': 'Cintura (cm)', 'cadera': 'Cadera (cm)',
        'brazo_izquierdo': 'Brazo izq. (cm)', 'brazo_derecho': 'Brazo der. (cm)',
        'pierna_izquierda': 'Muslo izq. (cm)', 'pierna_derecha': 'Muslo der. (cm)', 'grasa_corporal': '% grasa',
    }
    _hoja(libro, 'Medidas', ['Fecha'] + [nombres[c] for c in MedidaCorporal.CAMPOS], [
        [m.fecha.replace(tzinfo=None)] + [getattr(m, c) for c in MedidaCorporal.CAMPOS]
        for m in usuario.medidas_corporales.order_by('fecha')
    ])

    filas = [
        [rutina.nombre, paso.ejercicio.nombre, paso.series, paso.repeticiones, paso.descanso_segundos]
        for rutina in usuario.rutina_set.prefetch_related('rutinaejercicio_set__ejercicio').order_by('nombre')
        for paso in rutina.rutinaejercicio_set.all()
    ]
    _hoja(libro, 'Rutinas', ['Rutina', 'Ejercicio', 'Series', 'Repeticiones', 'Descanso (s)'], filas)

    # Formato de fecha legible en las hojas que la tienen
    for hoja in libro.worksheets:
        if hoja.cell(1, 1).value == 'Fecha':
            for (celda,) in hoja.iter_rows(min_row=2, max_col=1):
                celda.number_format = 'yyyy-mm-dd hh:mm'
            hoja.column_dimensions['A'].width = 18

    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()
