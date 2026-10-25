// Keep table column gaps while joining glyphs that share a baseline.
export function pdfTextLines(items) {
  const rows = [];
  for (const item of items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = item.transform[5],
      x = item.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) < 2);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, width: item.width, text: item.str });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      let end = -Infinity;
      return row.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => {
          const gap = part.x - end;
          end = part.x + part.width;
          return `${gap > 12 ? "    " : " "}${part.text}`;
        })
        .join("")
        .trim();
    })
    .join("\n");
}
