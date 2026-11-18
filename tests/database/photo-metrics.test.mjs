import { test } from "node:test";
import assert from "node:assert/strict";
import {
  photoOverview,
  suggestedPhotoPair,
  photoComparisonValues,
} from "../../src/lib/photo-metrics.ts";
const photo = (id, logged_on, category = "front") => ({
  id,
  project_id: "project",
  logged_on,
  category,
});
test("galeria distingue arquivos, datas e posições, sem contar apenas uma página", () => {
  const rows = Array.from({ length: 1005 }, (_, i) =>
    photo(
      String(i),
      i % 2 ? "2026-11-18" : "2026-11-17",
      i % 3 ? "front" : "side",
    ),
  );
  rows.push(photo("future", "2026-11-19"));
  const view = photoOverview(rows, "2026-11-18", "2026-11-01");
  assert.equal(view.count, 1005);
  assert.equal(view.dateCount, 2);
  assert.equal(view.projectDay, 18);
  assert.equal(
    view.positions.reduce((sum, p) => sum + p.count, 0),
    1005,
  );
  assert.equal(
    view.timeline.reduce((sum, day) => sum + day.count, 0),
    1005,
  );
  assert.ok(
    view.timeline.every((day) => new Set(day.poses).size === day.poses.length),
  );
  assert.equal(view.positions.find((p) => p.key === "back").latest, null);
});
test("galeria vazia não inventa atualização, dia de projeto ou miniatura", () => {
  const view = photoOverview([], "2026-11-18", "2026-11-01");
  assert.equal(view.latest, null);
  assert.equal(view.projectDay, null);
  assert.equal(view.count, 0);
  assert.equal(view.dateCount, 0);
  assert.deepEqual(view.timeline, []);
  assert.ok(view.positions.every((p) => p.count === 0 && p.latest === null));
});
test("comparação inicial sugere fotos distintas da mesma posição em ordem cronológica", () => {
  const old = photo("old", "2026-10-01"),
    recent = photo("new", "2026-11-18"),
    side = photo("side", "2026-11-01", "side");
  assert.deepEqual(
    suggestedPhotoPair([recent, side, old]).map((p) => p.id),
    ["old", "new"],
  );
  assert.deepEqual(suggestedPhotoPair([recent, side, old], "side"), []);
  assert.deepEqual(suggestedPhotoPair([recent, side]), []);
});
test("comparativo só usa medidas das datas exatas, preservando ausência e diferença zero", () => {
  const values = photoComparisonValues(
    "2026-11-01",
    "2026-11-18",
    [
      { logged_on: "2026-11-01", kg: "94.00" },
      { logged_on: "2026-11-17", kg: "93.00" },
    ],
    [
      { logged_on: "2026-11-01", value_cm: "90.00" },
      { logged_on: "2026-11-18", value_cm: "90.00" },
    ],
  );
  assert.deepEqual(values.weight, {
    first: 94,
    second: null,
    difference: null,
  });
  assert.deepEqual(values.waist, { first: 90, second: 90, difference: 0 });
  const same = photoComparisonValues(
    "2026-11-01",
    "2026-11-01",
    [{ logged_on: "2026-11-01", kg: 94 }],
    [],
  );
  assert.equal(same.weight.difference, 0);
  assert.equal(same.waist.first, null);
  assert.equal(same.waist.difference, null);
});
