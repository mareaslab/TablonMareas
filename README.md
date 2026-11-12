<img src="assets/logo.svg" alt="Tabla de mareas" width="280">

# Tabla de mareas

Radar y preparación de convocatorias para una asociación pequeña. Responde cada lunes a tres preguntas: qué cierra y cuándo, si la entidad cumple los requisitos **en la fecha de cierre**, y qué toca hacer esta semana para llegar a tiempo.

Es un único archivo, `index.html`. Funciona sin conexión, sin instalar nada y sin cuentas: los datos se guardan en el navegador del ordenador donde se usa.

## Cómo empezar

1. Descarga `index.html` y ábrelo con doble clic (Firefox, Chrome o Chromium).
2. Pulsa **Datos → Importar** y elige tu archivo de datos `.json`, o añade la primera convocatoria con **Nueva**.
3. En **Entidad**, revisa la fecha de constitución, los ejercicios y los registros. De ahí sale la elegibilidad de todo lo demás.

Guarda `index.html` siempre en la misma carpeta: el navegador asocia los datos a la ubicación del archivo, y si lo mueves parecerá vacío (los datos siguen ahí; basta con importar la última copia).

## Qué hace

| Pantalla | Para qué sirve |
|---|---|
| **Hoy** | El próximo plazo en grande y lo que pide decisión: plazos vencidos, cierres en 30 días, fechas estimadas que hay que confirmar, convocatorias a las que la entidad no puede optar, tareas de la quincena y documentos que caducan. |
| **Convocatorias** | Todo el radar, ordenado por plazo, con el estado editable en la propia lista, filtros por fase y ámbito, y buscador. |
| **Calendario** | Catorce meses en una línea de tiempo: preparación, ventana abierta y cierre de cada convocatoria, los hitos de la entidad y una curva que muestra en qué meses se acumulan los plazos. |
| **Textos** | Los párrafos que se repiten en cada solicitud (quiénes somos, trayectoria, equipo), con contador de caracteres, límite por financiador, copia en un clic y duplicado para versiones cortas o en otro idioma. |
| **Entidad** | Logo y color de marca, antigüedad, ejercicios cerrados, utilidad pública, registros y documentación. Calcula en qué fecha se desbloquea cada requisito y qué convocatorias lo exigen. |
| **Informe** | Una página para la junta con cifras, decisiones pendientes y plazos de seis meses, lista para imprimir o guardar como PDF con el logo de la entidad. |

En la ficha de cada convocatoria:

- **Generar plan hacia atrás** reparte siete pasos desde la fecha de cierre (bases, socios, memoria, presupuesto, documentación, revisión y envío). Si queda poco tiempo, los comprime en los días disponibles.
- **Documentación que piden las bases** cruza lo que exige la convocatoria con lo que la entidad tiene listo. Un certificado que caduca antes del cierre cuenta como pendiente.
- **Crear la edición siguiente** copia la convocatoria un año después, con las fechas marcadas como estimadas, para que el radar no se vacíe.

Los cambios de estado, las tareas marcadas y las eliminaciones se pueden **deshacer** desde el aviso que aparece abajo. Atajos de teclado: `N` crea una convocatoria y `/` salta al buscador.

## Trabajar en equipo

Los datos no se sincronizan solos. La rutina que funciona:

- Una persona lleva el radar y, al terminar, pulsa **Datos → Descargar copia** y deja el `.json` en la carpeta compartida.
- Quien quiera verlo en su ordenador abre `index.html` e importa esa copia con **Reemplazar**.
- **Copiar resumen para el equipo** deja en el portapapeles un texto listo para pegar en el chat.
- **Llevar los plazos a mi calendario** descarga un `.ics` con cierres, inicios de preparación y tareas para Google Calendar o el móvil.

**Fusionar** permite añadir convocatorias nuevas o actualizar fechas sin perder las tareas ya creadas. Empareja por `idExterno` o, si no lo hay, por nombre.

## Formato de los datos

```json
{
  "entidad": {
    "nombre": "Mi asociación",
    "logo": "data:image/svg+xml;base64,…",
    "color": "#5527e8",
    "constitucion": "2026-08-31",
    "ejercicios": [{ "anio": 2026, "previsto": "2027-06-30", "aprobado": "" }]
  },
  "convocatorias": [
    {
      "nombre": "Nombre de la convocatoria",
      "ambito": "Cataluña",
      "estado": "En estudio",
      "encaje": 4,
      "apertura": "2027-03-13",
      "plazo": "2027-04-13",
      "plazoConfirmado": false,
      "importeTexto": "Hasta 25.000 €",
      "reqAntiguedadMeses": 12,
      "reqEjercicios": 1,
      "reqRegistros": ["cens-juvenils"],
      "reqDocs": ["doc-1", "doc-7"],
      "responsable": "Nombre",
      "reqVerificado": false,
      "notas": "Requisitos y siguiente paso",
      "enlace": "https://…"
    }
  ],
  "textos": [
    { "titulo": "Quiénes somos", "etiqueta": "ES · breve", "limite": 300, "texto": "…" }
  ]
}
```

Solo `nombre` es obligatorio. Las fechas van en formato `AAAA-MM-DD`. Estados admitidos: Detectada, En estudio, Aún no abierta, En preparación, Presentada, Concedida, En ejecución, Justificada, Denegada, Cerrada y Descartada.

## Privacidad

La app no envía nada a ningún servidor ni carga recursos externos. No subas a un repositorio público tus archivos de datos: `.gitignore` ya excluye `datos*.json`, las copias de seguridad y los archivos generados con datos dentro.

## Modificar la app

El código está en `src/` (`app.js`, `styles.css`, `index.template.html` y las tipografías). Después de cambiar algo:

```bash
python3 build.py
```

Eso regenera `index.html` con todo incrustado. Solo hace falta Python 3.

Para generar un archivo que se abra ya con los datos, el logo y los textos de tu entidad:

```bash
python3 build.py --datos mis-datos.json --salida mi-entidad.html
```

Esos datos iniciales solo se usan la primera vez; a partir de ahí manda lo que se guarde en el navegador. **Datos → Volver a los datos iniciales** los recupera.

Para probar con una fecha concreta, añade `?hoy=2027-03-01` a la dirección.

## Créditos

Tipografías Bricolage Grotesque e IBM Plex Sans, con licencia SIL Open Font License 1.1 (textos en `src/fonts/`).
