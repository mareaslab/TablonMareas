#!/usr/bin/env python3
"""Une src/ en un único index.html que se abre con doble clic, sin servidor.

Uso:  python3 build.py
No necesita instalar nada: solo Python 3.
"""
import base64
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


def main() -> None:
    html = (SRC / "index.template.html").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise SystemExit("app.js contiene '</script': rompería el HTML.")
    html = html.replace("/*__FUENTES__*/", fuentes_css())
    html = html.replace("/*__CSS__*/", (SRC / "styles.css").read_text(encoding="utf-8"))
    html = html.replace("/*__JS__*/", js)
    salida = RAIZ / "index.html"
    salida.write_text(html, encoding="utf-8")
    print(f"index.html generado: {salida.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
