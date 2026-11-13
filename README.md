# Tabla de mareas

Radar y preparación de convocatorias para una asociación pequeña: qué cierra y cuándo, si la entidad cumple los requisitos en la fecha de cierre y qué toca hacer esta semana.

Es un único archivo, `index.html`. Funciona sin conexión y sin cuentas. Los datos se guardan en el navegador de cada persona.

## Usar

1. Abre `index.html` (o la página de GitHub Pages) en Chrome, Firefox o Safari.
2. En **Entidad**, revisa la fecha de constitución, los ejercicios y los registros: de ahí sale la elegibilidad.
3. Añade convocatorias con **Nueva**, o impórtalas en **Datos**.
4. Descarga una copia desde **Datos** de vez en cuando.

## Sincronizar con monday

En **Datos → monday.com**: número del tablero (tras `/boards/` en su dirección) y token personal (monday → tu foto → Developers → My access tokens). El botón trae el tablero, envía los cambios hechos aquí (previa confirmación) y crea el plan de tareas como subtareas cuando una convocatoria pasa a «En preparación». Si un dato cambia en los dos sitios, gana monday. El token se guarda solo en ese navegador.

Las columnas se reconocen por su título; la lista está en `MON_CAMPOS`, en `src/app.js`.

## Datos

JSON con `entidad`, `convocatorias` y `textos`. Solo `nombre` es obligatorio en cada convocatoria; las fechas van como `AAAA-MM-DD`. Los archivos `datos*.json` no se suben al repositorio (`.gitignore`).

## Modificar

El código está en `src/`. Para regenerar `index.html` (necesita Python 3):

```bash
python3 build.py
python3 build.py --datos mis-datos.json --salida mi-entidad.html   # con tus datos ya cargados
```

Tipografías Bricolage Grotesque e IBM Plex Sans, licencia SIL OFL 1.1 (`src/fonts/`).
