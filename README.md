# Body Rhythm

Body Rhythm es una plataforma web de fitness diseñada para apoyar la gestión del entrenamiento. Permite consultar ejercicios, organizar rutinas, registrar actividades y acceder a funcionalidades de seguimiento del progreso y asistencia mediante inteligencia artificial.

Incluye rutinas personalizadas según objetivo e IMC, y un chatbot con IA para generar rutinas.

## Qué problema resuelve y para quién

<Una o dos líneas: por ejemplo, personas que quieren empezar a entrenar y no saben qué rutina seguir ni cómo medir su avance.>

## Tecnologías utilizadas

- **Frontend:** React y Vite, responsables de la interfaz de usuario.
- **Backend:** Django 4.2 y Django REST Framework, encargados de la lógica de negocio y la API.
- **Base de datos:** MySQL (XAMPP en local), utilizada para almacenar y consultar la información de la aplicación.
- **Comunicación:** solicitudes y respuestas HTTP entre el frontend y el backend.
- **Inteligencia artificial:** integración con Google Gemini mediante la configuración de `GEMINI_API_KEY` en el backend.
- **Control de versiones:** Git y GitHub.

## Integrantes

| Integrante | GitHub | Rol |
|---|---|---|
| juan david | [@juandavid-zz](https://github.com/juandavid-zz) | Perfil, entrenamientos y dashboard |
| Kevin | <@usuario> | Ejercicios y progreso |
| José Fernando | <@usuario> | Rutinas y admin |

## Arquitectura del sistema

La aplicación utiliza una arquitectura cliente-servidor. El usuario interactúa con la interfaz desarrollada en React, que envía solicitudes HTTP a la API del backend. Django REST Framework procesa las solicitudes y se comunica con MySQL cuando necesita consultar o guardar información.

Para las funcionalidades que lo requieren, el backend también puede comunicarse con el servicio externo de inteligencia artificial Google Gemini. Finalmente, la API devuelve las respuestas al frontend para presentarlas al usuario.

```mermaid
flowchart TD
    U[Usuario] <--> F[Frontend: React + Vite]
    F <-->|Solicitudes y respuestas HTTP| API[Backend: Django REST Framework]
    API <--> DB[(Base de datos MySQL)]
    API -.->|Cuando se requiere IA| IA[Servicio externo: Google Gemini]
```

## Flujo de las solicitudes

1. El usuario interactúa con la aplicación desde el frontend.
2. React envía solicitudes HTTP a los endpoints de la API.
3. Django REST Framework recibe y procesa las solicitudes.
4. Cuando corresponde, el backend consulta o actualiza la información almacenada en MySQL.
5. En las funcionalidades que lo requieren, el backend puede solicitar asistencia al servicio de Google Gemini.
6. La API devuelve una respuesta que el frontend presenta al usuario.

## Cómo instalar y ejecutar

### Requisitos
- Node.js 18+
- Python 3.10+
- XAMPP (MySQL activo)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # completa tus propias credenciales
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Decisiones técnicas

- **Django REST Framework:** <por qué: el equipo ya conocía Django, trae serializers y permisos listos>.
- **Django 4.2 y no la última versión:** es compatible con la versión de MariaDB/MySQL de XAMPP.
- **MySQL:** <por que es la que mas conocemos, ya que hemos trabajado con ella antes>.
- **React + Vite:** <por qué: arranque rápido y recarga instantánea en desarrollo>.
- **Google Gemini para el chatbot:** <por qué se eligió>.

## Pruebas

<Qué probaron y cómo: por ejemplo, pruebas manuales de cada módulo, endpoints probados con Postman, etc.>

## Estructura de carpetas

```
body-rhythm/
├── backend/     # API Django REST
├── frontend/    # Aplicación React + Vite
└── README.md
```

## Alcance de la documentación

Este documento presenta una descripción general de la arquitectura y las tecnologías de Body Rhythm. El diagrama representa los componentes principales y sus relaciones de comunicación; no detalla todos los módulos internos ni todos los endpoints de la aplicación.
