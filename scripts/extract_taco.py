from pathlib import Path
import argparse
import re
import json
import hashlib
import unicodedata

import pymupdf

parser = argparse.ArgumentParser(
    description="Extrair calorias e macros da TACO 4ª edição enviada para o projeto."
)
parser.add_argument("pdf", type=Path)
parser.add_argument("--output", type=Path, default=Path("src/data/taco-4.json"))
args = parser.parse_args()
source = args.pdf
doc = pymupdf.open(source)
items = []
# A Tabela 1 alterna macros/minerais (páginas PDF 29–67) e vitaminas.
# As coordenadas abaixo são específicas deste layout; falhar se ele mudar.
for pindex in range(28, 67, 2):
    p = doc[pindex]
    if p.rotation:
        p.remove_rotation()
    words = p.get_text("words")
    text = p.get_text(sort=True)
    assert "Proteína" in text and "Lipídeos" in text
    centers = {}
    for field, label in [
        ("kcal", "(kcal)"),
        ("protein", "Proteína"),
        ("fat", "Lipídeos"),
        ("carbs", "idrato"),
    ]:
        found = [w for w in words if w[4] == label]
        assert len(found) == 1, (pindex, label, found)
        centers[field] = (found[0][0] + found[0][2]) / 2
    # O número da linha identifica o alimento; alinhamento por y evita deslocar
    # colunas quando a tabela contém campos vazios ou marcadores.
    anchors = [w for w in words if 70 < w[0] < 105 and w[4].isdigit() and w[1] > 140]
    for anchor in anchors:
        row = [w for w in words if abs(w[1] - anchor[1]) < 1.6]
        name = " ".join(
            w[4] for w in sorted(row, key=lambda w: w[0]) if 110 < w[0] < 375
        )
        assert name, (pindex, anchor)
        entry = {
            "id": int(anchor[4]),
            "name": unicodedata.normalize("NFKC", name),
            "reference_amount": 100,
            "unit": "g",
            "pdf_page": pindex + 1,
            "printed_page": pindex - 2,
            "markers": {},
        }
        for field, center in centers.items():
            values = [w[4] for w in row if abs((w[0] + w[2]) / 2 - center) < 14]
            assert len(values) <= 1, (entry["id"], field, values)
            raw = values[0] if values else ""
            if re.fullmatch(r"\d+(?:,\d+)?", raw):
                entry[field] = float(raw.replace(",", "."))
            else:
                assert raw in ["", "Tr", "NA", "*"], (entry["id"], field, raw)
                entry[field] = None
                entry["markers"][field] = {
                    "": "not_analyzed",
                    "Tr": "trace",
                    "NA": "not_applicable",
                    "*": "under_review",
                }[raw]
        items.append(entry)
assert len(items) == 597 and sorted(x["id"] for x in items) == list(range(1, 598))
assert all(
    0 <= x[k] <= 100
    for x in items
    for k in ["protein", "carbs", "fat"]
    if x[k] is not None
)
assert all(0 <= x["kcal"] <= 1000 for x in items if x["kcal"] is not None)
metadata = {
    "title": "Tabela Brasileira de Composição de Alimentos – TACO",
    "institution": "NEPA/UNICAMP",
    "edition": "4ª edição revisada e ampliada",
    "year": 2011,
    "license": "É permitida a reprodução parcial ou total desta obra, desde que citada a fonte.",
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "basis": "100 g de parte comestível",
}
path = args.output
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(
    json.dumps({"metadata": metadata, "items": items}, ensure_ascii=False, indent=2)
    + "\n"
)
print(f"{len(items)} alimentos extraídos; marcadores não numéricos preservados.")
