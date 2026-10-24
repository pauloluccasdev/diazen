import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { dietPdf } from "./fixtures/diet-pdf.mjs";
// External nutrition is tested separately with deterministic provider responses.
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/alimentos/online", (route) =>
    route.fulfill({ json: { hits: [] } }),
  );
});
async function emulateOlderPdfPlatform(page: Page) {
  // Simulates missing platform APIs in Safari versions preceding the newest engine.
  const removeRecentApis = () => {
    Reflect.deleteProperty(Map.prototype, "getOrInsertComputed");
    Reflect.deleteProperty(Map.prototype, "getOrInsert");
    Reflect.deleteProperty(Promise, "try");
    Reflect.deleteProperty(Math, "sumPrecise");
    Reflect.deleteProperty(Uint8Array.prototype, "toHex");
    Reflect.deleteProperty(Uint8Array.prototype, "toBase64");
    Reflect.deleteProperty(Uint8Array, "fromHex");
    Reflect.deleteProperty(Uint8Array, "fromBase64");
  };
  await page.addInitScript(removeRecentApis);
  await page.route("**/pdf/worker-*.mjs", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `(${removeRecentApis.toString()})();\n${await response.text()}`,
    });
  });
}
async function failLocalPdfRead(page: Page) {
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      if (this.name !== "invalido.pdf") {
        Reflect.set(globalThis, "diazenForcedPdfReadFailure", true);
        return Promise.reject(
          new DOMException("Local file reader unavailable", "NotReadableError"),
        );
      }
      return original.call(this);
    };
  });
}
for (const mode of ["native", "compatibility", "server"] as const) {
  const compatibility = mode === "compatibility";
  const server = mode === "server";
  test(`PDF privado, revisão e cálculo · ${server ? "leitor local indisponível" : compatibility ? "compatibilidade Safari" : "APIs nativas"}`, async ({
    page,
  }) => {
    if (compatibility) await emulateOlderPdfPlatform(page);
    if (server) {
      // Reproduce a local file-reading failure without relying on WebKit's
      // interception of module workers or cached dynamic imports.
      await failLocalPdfRead(page);
    }
    await page.goto("/entrar");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(
        server
          ? "plano-server@example.test"
          : compatibility
            ? "plano-compat@example.test"
            : "plano@example.test",
      );
    await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/painel$/);
    await page.goto("/painel/projetos");
    await page.getByLabel("Nome do projeto", { exact: true }).fill("Plano E2E");
    await page.getByLabel("Meta diária de água (ml)").fill("2000");
    await page
      .getByRole("button", { name: "Criar projeto", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Projeto criado");
    await page.goto("/painel/alimentacao");
    await page.getByRole("link", { name: /Meu plano alimentar/ }).click();
    const pdf = dietPdf([
      [
        [[50, "Refeição 1"]],
        [
          [50, "Pão francês"],
          [330, "1 Unidade(s) (50g)"],
        ],
        [[50, "Observações:"]],
      ],
      [
        [[50, "Refeição 1 - Opção 2"]],
        [
          [50, "Banana"],
          [330, "À vontade"],
        ],
        [[50, "Observações:"]],
      ],
    ]);
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") requests.push(r.url());
    });
    await page.getByLabel("Selecionar PDF").setInputFiles({
      name: "plano-ficticio.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await expect(
      page.getByRole("heading", { name: "Refeição 1 · opção 1", exact: true }),
    ).toBeVisible();
    if (server) {
      expect(
        await page.evaluate(() =>
          Reflect.get(globalThis, "diazenForcedPdfReadFailure"),
        ),
      ).toBe(true);
      expect(requests).toEqual(["http://127.0.0.1:3100/api/plano/ler"]);
    } else expect(requests).toEqual([]);
    await expect(
      page.getByRole("button", { name: "Salvar versão do plano" }),
    ).toBeDisabled();
    await page
      .getByRole("article", { name: "Pão francês", exact: true })
      .getByText("Revisar dados nutricionais", { exact: true })
      .click();
    await expect(
      page.getByLabel("Calorias (kcal)", { exact: true }),
    ).toHaveValue("150");
    await expect(
      page.getByLabel("Calorias (kcal)", { exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Fonte dos valores")).toHaveValue(/TACO/);
    await page.getByLabel("Buscar correspondência na TACO").fill("pao frances");
    await page
      .getByRole("button", {
        name: "Pão, trigo, francês · item 53",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("150 kcal", { exact: true }).first(),
    ).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Revisei a extração", { exact: false }).check();
    await page.getByRole("button", { name: "Salvar versão do plano" }).click();
    await expect(page.getByRole("status")).toContainText("Plano salvo");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Refeição 1 · opção 1", exact: true }),
    ).toBeVisible();
    const exported = await (await page.request.get("/api/exportar")).json();
    expect(exported.diet_plans).toHaveLength(1);
    expect(
      exported.diet_plans[0].document.meals[0].groups[0].choices[0].tacoId,
    ).toBe(53);
    expect(exported.meal_items).toHaveLength(0);
    page.once("dialog", (d) => d.accept());
    await page.getByLabel("Selecionar PDF").setInputFiles({
      name: "invalido.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("arquivo inválido"),
    });
    await expect(page.locator("p[role=alert]")).toContainText(
      "Não foi possível ler",
    );
  });
}

test("amostras privadas locais preservam refeições e variantes", async ({
  page,
}) => {
  test.skip(
    !process.env.DIAZEN_PRIVATE_PLAN_PDF ||
      !process.env.DIAZEN_PRIVATE_NUTRIENT_PDF,
    "Amostras pessoais não são versionadas nem usadas na CI",
  );
  await emulateOlderPdfPlatform(page);
  // Personal PDFs are processed only by this isolated localhost test server.
  await failLocalPdfRead(page);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("plano@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/plano");
  page.on("dialog", (d) => d.accept());
  for (const [file, count] of [
    [process.env.DIAZEN_PRIVATE_PLAN_PDF!, 10],
    [process.env.DIAZEN_PRIVATE_NUTRIENT_PDF!, 4],
  ] as const) {
    await expect(page.getByLabel("Selecionar PDF")).toBeEnabled();
    await page.getByLabel("Selecionar PDF").setInputFiles(file);
    await expect(
      page.locator(".plan-workspace section").filter({
        has: page.getByLabel("Incluir esta opção no cálculo", {
          exact: false,
        }),
      }),
    ).toHaveCount(count);
    if (count === 4)
      await expect(
        page.getByText("1.453 kcal", { exact: true }).first(),
      ).toBeVisible();
  }
});
