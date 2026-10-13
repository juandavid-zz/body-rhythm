BODYRHYTHM



BODYRHYTHM es una plataforma orientada al mejoramiento de la condición física mediante rutinas de entrenamiento, planes de nutrición y seguimiento del progreso.



Tecnologías



\- Frontend: React.

\- Backend: Django.

\- Base de datos: MySQL.



Arquitectura del sistema



El sistema conecta la interfaz de usuario con el backend, que procesa las solicitudes y gestiona los datos de la aplicación.



flowchart TD

&#x20;   U\[Usuario] --> F\[Frontend React]

&#x20;   F -->|Solicitudes HTTP| B\[Backend Django REST]

&#x20;   B --> D\[(Base de datos MySQL)]

&#x20;   D --> B

&#x20;   B --> F

&#x20;   F --> U

