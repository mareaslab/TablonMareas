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
| **Entidad** | Antigüedad, ejercicios cerrados, utilidad pública, registros y documentación. Calcula en qué fecha se desbloquea cada requisito y qué convocatorias lo exigen. |

En la ficha de cada convocatoria, **Generar plan hacia atrás** reparte siete pasos desde la fecha de cierre (bases, socios, memoria, presupuesto, documentación, revisión y envío). Si queda poco tiempo, los comprime en los días disponibles.

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
      "reqVerificado": false,
      "notas": "Requisitos y siguiente paso",
      "enlace": "https://…"
    }
  ]
}
```

Solo `nombre` es obligatorio. Las fechas van en formato `AAAA-MM-DD`. Estados admitidos: Detectada, En estudio, Aún no abierta, En preparación, Presentada, Concedida, En ejecución, Justificada, Denegada, Cerrada y Descartada.

## Privacidad

La app no envía nada a ningún servidor ni carga recursos externos. No subas a un repositorio público tus archivos de datos: `.gitignore` ya excluye `datos*.json` y las copias de seguridad.

## Modificar la app

El código está en `src/` (`app.js`, `styles.css`, `index.template.html` y las tipografías). Después de cambiar algo:

```bash
python3 build.py
```

Eso regenera `index.html` con todo incrustado. Solo hace falta Python 3.

Para probar con una fecha concreta, añade `?hoy=2027-03-01` a la dirección.

## Créditos

Tipografías Bricolage Grotesque e IBM Plex Sans, con licencia SIL Open Font License 1.1 (textos en `src/fonts/`).
