#!/usr/bin/env python3
"""Une src/ en un único index.html que se abre con doble clic, sin servidor.

Uso:
  python3 build.py                                   genera index.html, vacío
  python3 build.py --datos mis-datos.json            lo genera con esos datos ya cargados
  python3 build.py --datos mis-datos.json --salida mi-entidad.html

No necesita instalar nada: solo Python 3.
"""
import argparse
import base64
import json
from pathlib import Path

RAIZ = Path(__file__).parent
SRC = RAIZ / "src"

FUENTES = [
    ("Bricolage Grotesque", "200 800", "bricolage-grotesque-latin-wght-normal.woff2", "woff2-variations"),
    ("IBM Plex Sans", "400", "ibm-plex-sans-latin-400-normal.woff2", "woff2"),
    ("IBM Plex Sans", "600", "ibm-plex-sans-latin-600-normal.woff2", "woff2"),
]


def fuentes_css() -> str:
    bloques = []
    for familia, peso, archivo, formato in FUENTES:
        datos = base64.b64encode((SRC / "fonts" / archivo).read_bytes()).decode("ascii")
        bloques.append(
            f'@font-face{{font-family:"{familia}";font-style:normal;font-weight:{peso};font-display:swap;'
            f'src:url(data:font/woff2;base64,{datos}) format("{formato}");}}'
        )
    return "\n".join(bloques)


def semilla(ruta: str | None) -> str:
    """Datos iniciales, listos para ir dentro de una etiqueta <script type="application/json">."""
    if not ruta:
        return ""
    datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    if not isinstance(datos, dict):
        raise SystemExit("El archivo de datos tiene que ser un objeto JSON con «convocatorias» o «entidad».")
    texto = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    return texto.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--datos", help="archivo .json con los datos iniciales que llevará incrustados")
    ap.add_argument("--salida", default=str(RAIZ / "index.html"), help="archivo que se genera (por defecto, index.html)")
    args = ap.parse_args()

    html = (SRC / "index.template.html").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise SystemExit("app.js contiene '</script': rompería el HTML.")
    for marca, contenido in (
        ("/*__FUENTES__*/", fuentes_css()),
        ("/*__CSS__*/", (SRC / "styles.css").read_text(encoding="utf-8")),
        ("/*__SEMILLA__*/", semilla(args.datos)),
        ("/*__JS__*/", js),
    ):
        if html.count(marca) != 1:
            raise SystemExit(f"La plantilla debe contener {marca} una sola vez.")
        html = html.replace(marca, contenido)
    salida = Path(args.salida)
    salida.write_text(html, encoding="utf-8")
    print(f"{salida.name} generado: {salida.stat().st_size / 1024:.0f} KB" + (" (con datos iniciales)" if args.datos else ""))


if __name__ == "__main__":
    main()
