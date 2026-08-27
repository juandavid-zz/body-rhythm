import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get('GEMINI_API_KEY')
print("¿Se encontró GEMINI_API_KEY en el .env?", "SÍ" if api_key else "NO")

if not api_key:
    print("→ Revisa que exista backend/.env con la línea GEMINI_API_KEY=tu_clave")
else:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    modelo = genai.GenerativeModel('gemini-flash-latest')
    print("Probando conexión con Gemini...")
    respuesta = modelo.generate_content('di hola')
    print("Respuesta de Gemini:", respuesta.text)
