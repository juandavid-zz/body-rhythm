import os
import json
import time
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
Eres un entrenador personal experto. Genera una rutina de ejercicio
COMPLETA en JSON puro (sin texto adicional, sin ```json) con esta forma
exacta:

{{
  "nombre": "string",
  "descripcion": "string (2-3 frases, cercano y motivador)",
  "objetivo": "string breve, ej: 'Ganar fuerza y masa muscular en tren inferior'",
  "nivel": "principiante" | "intermedio" | "avanzado",
  "dias_por_semana": number,
  "duracion_minutos": number,
  "calentamiento": "string con una sugerencia breve y concreta de calentamiento (5-8 min) antes de empezar",
  "enfriamiento": "string con una sugerencia breve de estiramiento/enfriamiento al terminar",
  "consejos_generales": ["string", "string", "string"],
  "ejercicios": [
    {{
      "dia": "Día 1",
      "nombre": "string",
      "series": number,
      "repeticiones": number,
      "descanso_segundos": number,
      "consejo": "string breve de técnica o seguridad, SOLO si aporta valor real (ej. cuidar alineación de rodilla, evitar arquear la espalda); si no hay nada relevante que advertir, usa null"
    }}
  ]
}}

Datos del usuario:
{contexto}
Lugar de entrenamiento: {lugar}
Equipo disponible: {equipo}
{linea_grupo_muscular}

Instrucciones:
- Ajusta la intensidad y los ejercicios según el IMC, prioriza el grupo
  muscular indicado por el usuario, y evita ejercicios de alto impacto si
  el IMC indica sobrepeso u obesidad.
- "consejos_generales" debe traer entre 2 y 4 tips prácticos y variados
  para esta rutina en concreto (progresión de carga, descanso entre
  sesiones, hidratación, técnica general, etc.) — nada genérico de relleno.
- El campo "consejo" de cada ejercicio es OPCIONAL: solo inclúyelo cuando
  realmente aporte (técnica, riesgo de lesión, alineación). Si el ejercicio
  es simple y no necesita advertencia, pon null — no inventes consejos
  triviales para llenar espacio.
- Sé específico y realista con series/repeticiones/descanso según el nivel
  y el equipo disponible.
"""

    modelo = genai.GenerativeModel(
        MODELO,
        generation_config={"response_mime_type": "application/json"},
    )
    inicio = time.time()
    respuesta = modelo.generate_content(prompt)
    print(f"[chatbot_service] Gemini (generar_rutina_ia) tardó {time.time() - inicio:.2f}s")
    texto = respuesta.text.strip()

    # Por si Gemini igual envuelve el JSON en ```json ... ``` o le agrega
    # texto antes/después: nos quedamos solo con lo que hay entre el primer
    # '{' y el último '}'.
    if texto.startswith("```"):
        texto = texto.strip("`")
        texto = texto.replace("json\n", "", 1)

    inicio_json = texto.find("{")
    fin_json = texto.rfind("}")
    if inicio_json != -1 and fin_json != -1:
        texto = texto[inicio_json:fin_json + 1]

    try:
        return json.loads(texto)
    except json.JSONDecodeError as e:
        print(f"[chatbot_service] Gemini devolvió JSON inválido: {e}")
        print(f"[chatbot_service] Texto recibido (primeros 800 caracteres):\n{texto[:800]}")
        raise


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
    inicio = time.time()
    respuesta = chat.send_message(mensaje)
    print(f"[chatbot_service] Gemini (responder_pregunta_ia) tardó {time.time() - inicio:.2f}s")
    return respuesta.text.strip()