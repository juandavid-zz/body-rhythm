import json
import time
import google.generativeai as genai

from django.conf import settings

from .rutina_ia import catalogo_para_prompt, vincular_ejercicios

# ── Configuración de Gemini ──────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)
MODELO = "gemini-flash-latest"  # alias que siempre apunta al Flash estable vigente
# Para generar rutinas: con el catálogo en el prompt, Flash tarda más de un minuto y
# Flash-Lite unos segundos, eligiendo igual ejercicios de la biblioteca.
MODELO_RUTINA = "gemini-flash-lite-latest"


def calcular_imc(peso_kg, altura):
    # El registro guarda la altura en metros (1.75); por si viene en cm (175) también
    altura_m = altura / 100 if altura > 3 else altura
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
      "ejercicio_id": number,
      "nombre": "string",
      "series": number,
      "repeticiones": number,
      "descanso_segundos": number,
      "consejo": "string breve de técnica o seguridad, SOLO si aporta valor real (ej. cuidar alineación de rodilla, evitar arquear la espalda); si no hay nada relevante que advertir, usa null"
    }}
  ]
}}

Catálogo de ejercicios disponibles (id | nombre | grupo):
{catalogo_para_prompt()}

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
- Elige TODOS los ejercicios del catálogo de arriba: pon su número en
  "ejercicio_id" y copia su "nombre" exactamente igual. No inventes
  ejercicios que no estén en el catálogo.
- Usa "dia" para separar los días ("Día 1", "Día 2"...) según
  "dias_por_semana", con 4 a 8 ejercicios por día.
"""

    modelo = genai.GenerativeModel(
        MODELO_RUTINA,
        generation_config={"response_mime_type": "application/json"},
    )
    inicio = time.time()
    respuesta = modelo.generate_content(prompt)
    print(f"[chatbot_service] Gemini (generar_rutina_ia) tardó {time.time() - inicio:.2f}s")
    return vincular_ejercicios(_json_de(respuesta.text))


def _json_de(texto):
    """
    El JSON que devolvió Gemini. Por si igual lo envuelve en ```json ... ```
    o le agrega texto antes/después, se toma lo que hay entre el primer '{'
    y el último '}'. Lanza json.JSONDecodeError si no es válido.
    """
    texto = texto.strip()
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

# ── 3) Programa de varias semanas diseñado por la IA ──
NIVELES = {"principiante", "intermedio", "avanzado"}


def generar_programa_ia(usuario, dias, lugar, equipo, nivel, minutos, lesiones=""):
    """
    Diseña la semana tipo de un programa: qué entrenar cada día y con qué
    ejercicios de la biblioteca. Devuelve el mismo formato de rutina que
    generar_rutina_ia (ejercicios con "dia"), listo para guardar_rutina.
    Lanza excepción si Gemini falla: la vista usa el programa de respaldo.
    """
    ejercicios_por_dia = max(4, min(8, round(minutos / 9)))
    linea_lesiones = (
        f"Lesiones o molestias que indicó: {lesiones}. EVITA los ejercicios que las carguen "
        "y prefiere variantes seguras."
        if lesiones else "No indicó lesiones."
    )

    prompt = f"""
Eres un entrenador personal experto en programación del entrenamiento.
Diseña la SEMANA TIPO de un programa que se repetirá varias semanas con
sobrecarga progresiva. Responde en JSON puro (sin texto adicional) con esta
forma exacta:

{{
  "nombre": "string corto para el programa (máx. 40 caracteres), ej: 'Fuerza en 4 días'",
  "descripcion": "string (1-2 frases) explicando la lógica del programa",
  "ejercicios": [
    {{
      "dia": "Día 1 · Empuje",
      "ejercicio_id": number,
      "nombre": "string",
      "series": number,
      "repeticiones": number,
      "descanso_segundos": number
    }}
  ]
}}

Catálogo de ejercicios disponibles (id | nombre | grupo):
{catalogo_para_prompt()}

Datos del usuario:
{_contexto_usuario(usuario)}
Días por semana: {dias}
Lugar: {lugar}
Equipo disponible: {equipo}
Nivel: {nivel}
Minutos por sesión: {minutos}
{linea_lesiones}

Instrucciones:
- Exactamente {dias} días distintos. El campo "dia" es "Día N · Enfoque"
  (máx. 25 caracteres), ej. "Día 1 · Superior", "Día 2 · Pierna", "Día 3 · Tirón".
- Elige una división adecuada a los días: 2 días = cuerpo completo o
  superior/inferior; 3 = empuje/tirón/pierna o cuerpo completo; 4 = superior/
  inferior x2; 5-6 = empuje/tirón/pierna con repeticiones.
- Que cada grupo muscular grande se entrene al menos una vez por semana y que
  no se repita el mismo grupo en días seguidos si se puede evitar.
- {ejercicios_por_dia} ejercicios por día, empezando por los compuestos
  (sentadilla, peso muerto, press, remo, dominadas) y terminando con los de
  aislamiento.
- Series y repeticiones según el nivel: principiante 3 x 10-12, intermedio
  3-4 x 8-12, avanzado 4-5 x 5-10 en compuestos. Descanso 60-180 s según el ejercicio.
- Usa solo ejercicios posibles con el equipo y el lugar indicados.
- Elige TODOS los ejercicios del catálogo: pon su número en "ejercicio_id" y
  copia su "nombre" exactamente igual. No inventes ejercicios.
"""

    modelo = genai.GenerativeModel(
        MODELO_RUTINA,
        generation_config={"response_mime_type": "application/json"},
    )
    inicio = time.time()
    respuesta = modelo.generate_content(prompt)
    print(f"[chatbot_service] Gemini (generar_programa_ia) tardó {time.time() - inicio:.2f}s")
    return vincular_ejercicios(_json_de(respuesta.text))


def resumen_semana_ia(usuario, datos):
    """
    2-3 frases de entrenador sobre la semana que pasó, a partir de los números
    ya calculados (no inventa datos). Lanza excepción si Gemini falla.
    """
    prompt = f"""
Eres un entrenador personal cercano y directo. Escribe un resumen de la
semana de entrenamiento QUE ACABA DE TERMINAR (la semana pasada; di "la semana
{datos['semana']}" o "la semana pasada", nunca "esta semana") de tu cliente en 2 o 3
frases cortas, en español, tuteando, sin emojis y sin títulos. Menciona un logro concreto y da UN
consejo práctico para la semana que viene. Usa solo estos datos, no inventes:

{json.dumps(datos, ensure_ascii=False, default=str)}
"""
    modelo = genai.GenerativeModel(MODELO_RUTINA)
    respuesta = modelo.generate_content(prompt)
    return respuesta.text.strip()[:600]
