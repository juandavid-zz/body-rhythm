import os
import json
import google.generativeai as genai

from django.conf import settings

# ── Configuración de Gemini ──────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)
MODELO = "gemini-flash-latest"  # alias que siempre apunta al Flash estable vigente


def calcular_imc(peso_kg, altura_cm):
    altura_m = altura_cm / 100
    return round(peso_kg / (altura_m ** 2), 1)


def obtener_rango_imc(imc):
    if imc < 18.5:
        return "bajo_peso"
    if imc < 25:
        return "normal"
    if imc < 30:
        return "sobrepeso"
    return "obesidad"


def _contexto_usuario(usuario):
    """Arma un bloque de contexto con los datos de perfil disponibles."""
    perfil = getattr(usuario, "usuario", None) or usuario
    peso = getattr(perfil, "peso", None)
    altura = getattr(perfil, "altura", None)
    meta = getattr(perfil, "meta", None)

    partes = []
    if peso and altura:
        imc = calcular_imc(float(peso), float(altura))
        partes.append(f"IMC actual: {imc} ({obtener_rango_imc(imc)})")
    if meta:
        partes.append(f"Meta del usuario: {meta}")
    return "\n".join(partes) if partes else "Sin datos de perfil disponibles."


# ── 1) Generación de rutina estructurada (ya existente, formato JSON) ──
def generar_rutina_ia(usuario, lugar, equipo, grupo_muscular="cuerpo completo"):
    """
    Devuelve un dict con la rutina en JSON estructurado.
    Lanza excepción si Gemini falla (la vista debe capturarla y usar el
    catálogo de respaldo, como ya tenías).
    """
    contexto = _contexto_usuario(usuario)

    if grupo_muscular == "recomendado":
        linea_grupo_muscular = (
            "Grupo muscular a enfocar: el usuario te pide que TÚ decidas el "
            "enfoque más adecuado según su IMC y su meta (ej. cuerpo completo, "
            "fuerza general, o priorizar una zona específica si su meta lo amerita)."
        )
    else:
        linea_grupo_muscular = f"Grupo muscular a enfocar: {grupo_muscular}"

    prompt = f"""
Eres un entrenador personal. Genera una rutina de ejercicio en JSON puro
(sin texto adicional, sin ```json) con esta forma exacta:

{{
  "nombre": "string",
  "descripcion": "string",
  "dias_por_semana": number,
  "duracion_minutos": number,
  "ejercicios": [
    {{"dia": "Día 1", "nombre": "string", "series": number, "repeticiones": number}}
  ]
}}

Datos del usuario:
{contexto}
Lugar de entrenamiento: {lugar}
Equipo disponible: {equipo}
{linea_grupo_muscular}

Ajusta la intensidad y los ejercicios según el IMC, prioriza el grupo
muscular indicado por el usuario, y evita ejercicios de alto impacto si
el IMC indica sobrepeso u obesidad.
"""

    modelo = genai.GenerativeModel(MODELO)
    respuesta = modelo.generate_content(prompt)
    texto = respuesta.text.strip()

    # Por si Gemini igual envuelve el JSON en ```json ... ```
    if texto.startswith("```"):
        texto = texto.strip("`")
        texto = texto.replace("json\n", "", 1)

    return json.loads(texto)


# ── 2) NUEVO: respuesta libre para el chat (texto/Markdown) ──
def responder_pregunta_ia(usuario, mensaje, historial=None, rutina_actual=None):
    """
    historial: lista de dicts [{"rol": "user"|"model", "texto": "..."}]
    rutina_actual: dict con la última rutina generada (opcional, da contexto)
    Devuelve un string en Markdown con la respuesta.
    """
    contexto = _contexto_usuario(usuario)

    instrucciones_sistema = f"""
Eres el asistente de fitness de la app Body Rhythm. Respondes preguntas
sobre entrenamiento, ejercicios, técnica, dolores comunes o ajustes de
rutina. Sé claro, cercano y profesional.

Formatea SIEMPRE tu respuesta en Markdown: usa encabezados (##, ###),
listas, texto en negrita para lo importante, y tablas cuando compares
ejercicios o datos. No uses bloques de código a menos que te pidan código.

Contexto del usuario:
{contexto}
"""
    if rutina_actual:
        instrucciones_sistema += f"\nRutina actual del usuario: {json.dumps(rutina_actual, ensure_ascii=False)}\n"

    # Reconstruir el historial en el formato que espera la SDK de Gemini
    contenido_previo = []
    for turno in (historial or []):
        rol = "user" if turno.get("rol") == "user" else "model"
        contenido_previo.append({"role": rol, "parts": [turno.get("texto", "")]})

    modelo = genai.GenerativeModel(
        MODELO,
        system_instruction=instrucciones_sistema,
    )
    chat = modelo.start_chat(history=contenido_previo)
    respuesta = chat.send_message(mensaje)
    return respuesta.text.strip()