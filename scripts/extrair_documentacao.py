#!/usr/bin/env python3
"""Gera cópias consultáveis dos DOCX usando apenas a biblioteca padrão."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
FILES = {
    "Diazen_Especificacao_Funcional_Nao_Funcional_MVP_0_1_v1_1.docx": "requisitos.md",
    "Diazen_Design_System_MVP_0_1_v1_1.docx": "design-system.md",
}

def paragraph(node):
    return "".join(t.text or "" for t in node.findall(".//w:t", NS)).strip()

def cell(node):
    return "<br>".join(filter(None, (paragraph(p) for p in node.findall(".//w:p", NS)))).replace("|", "\\|")

def main():
    for original, target in FILES.items():
        with ZipFile(ROOT / "docs/originais" / original) as archive:
            body = ET.fromstring(archive.read("word/document.xml")).find("w:body", NS)
        lines = [f"# {'Requisitos funcionais e não funcionais' if target == 'requisitos.md' else 'Design System'} — Diazen", "", f"> Cópia de consulta gerada de [DOCX original](originais/{original}). O original é a fonte documental; esta extração preserva texto e tabelas, sem reproduzir a diagramação ou imagens incorporadas.", ""]
        for node in body:
            if node.tag == f"{{{NS['w']}}}p":
                text = paragraph(node)
                if text:
                    lines.extend([text, ""])
            elif node.tag == f"{{{NS['w']}}}tbl":
                rows = [[cell(c) for c in row.findall("w:tc", NS)] for row in node.findall("w:tr", NS)]
                if rows:
                    width = max(map(len, rows))
                    rows = [row + [""] * (width - len(row)) for row in rows]
                    for i, row in enumerate(rows):
                        lines.append("| " + " | ".join(row) + " |")
                        if i == 0:
                            lines.append("| " + " | ".join(["---"] * width) + " |")
                    lines.append("")
        (ROOT / "docs" / target).write_text("\n".join(lines), encoding="utf-8")
        print(f"Gerado: docs/{target}")

if __name__ == "__main__":
    main()
