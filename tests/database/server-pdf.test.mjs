import test from "node:test";
import assert from "node:assert/strict";
import {
  readServerDietPdf,
  ServerDietPdfError,
} from "../../src/lib/server-diet-pdf.ts";
import { dietPdf } from "../fixtures/diet-pdf.mjs";
test("leitura temporária isolada extrai tabelas e encerra o worker", async () => {
  const bytes = dietPdf([
    [
      [[50, "Refeição 1"]],
      [
        [50, "Arroz"],
        [330, "125g"],
      ],
      [[50, "Observações:"]],
    ],
  ]);
  const plan = await readServerDietPdf(new Uint8Array(bytes));
  assert.equal(plan.meals.length, 1);
  assert.equal(plan.meals[0].groups[0].choices[0].amount, 125);
  assert.equal(plan.meals[0].groups[0].choices[0].values.kcal, 160);
  await assert.rejects(
    () => readServerDietPdf(new Uint8Array(Buffer.from("%PDF-invalid"))),
    ServerDietPdfError,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => readServerDietPdf(new Uint8Array(bytes), controller.signal),
    ServerDietPdfError,
  );
});
