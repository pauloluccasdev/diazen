import { test, expect } from "@playwright/test";
import { dietPdf } from "./fixtures/diet-pdf.mjs";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("alimento tem resumo, troca explícita e referência online automática e editável por porção", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("online-food@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Online QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/plano");
  await expect(page.getByLabel("Selecionar PDF")).toBeEnabled();
  const reference = {
    code: "1234567890123",
    name: "Creme light fictício fictício",
    brand: "Marca de teste",
    amount: 30,
    unit: "g",
    values: { kcal: 60, protein: 3, carbs: 0, fat: 4 },
  };
  const calls: string[] = [];
  let transient = true;
  await page.route("**/api/alimentos/online", async (route) => {
    const data = route.request().postDataJSON();
    calls.push(`${data.kind}:${data.query}`);
    if (data.kind === "search" && transient) {
      transient = false;
      await route.fulfill({
        status: 503,
        json: { message: "Indisponibilidade transitória" },
      });
      return;
    }
    if (data.kind === "product" && data.query === "1111111111111") {
      await route.fulfill({
        status: 404,
        json: { message: "Rótulo sem composição" },
      });
      return;
    }
    await route.fulfill({
      json:
        data.kind === "search"
          ? {
              hits: [
                {
                  code: "1111111111111",
                  name: "Primeiro sem composição",
                  brand: "Teste",
                },
                {
                  code: reference.code,
                  name: reference.name,
                  brand: reference.brand,
                },
              ],
            }
          : { reference },
    });
  });
  await page.getByLabel("Selecionar PDF").setInputFiles({
    name: "ficticio.pdf",
    mimeType: "application/pdf",
    buffer: dietPdf([
      [
        [[50, "Refeição 1"]],
        [
          [50, "Creme light fictício"],
          [330, "20g"],
        ],
        [
          [50, "Creme light fictício"],
          [330, "30g"],
        ],
        [
          [50, "Arroz branco"],
          [330, "125g"],
        ],
        [
          [50, "Peito de frango"],
          [330, "150g"],
        ],
        [[50, "Observações:"]],
      ],
    ]),
  });
  await expect(
    page
      .getByRole("article", { name: "Arroz branco", exact: true })
      .getByText("≈ 160 kcal", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Peito de frango", exact: true })
      .getByText("≈ 238,5 kcal", { exact: true }),
  ).toBeVisible();
  const rows = page.getByRole("article", {
    name: "Creme light fictício",
    exact: true,
  });
  const row = rows.first();
  await expect(row.getByText("≈ 40 kcal", { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await expect(
    rows.last().getByText("≈ 60 kcal", { exact: true }),
  ).toBeVisible();
  expect(calls).toEqual([
    "search:Creme light fictício",
    "search:Creme light fictício",
    "product:1111111111111",
    `product:${reference.code}`,
  ]);
  await expect(
    row.getByText("Consultar na internet", { exact: true }),
  ).toHaveCount(0);
  await expect(
    row.getByRole("link", { name: "Conferir fonte", exact: true }),
  ).toBeVisible();
  await row.getByText("Revisar dados nutricionais", { exact: true }).click();
  await expect(row.getByLabel("Calorias (kcal)", { exact: true })).toHaveValue(
    "40",
  );
  await expect(row.getByLabel("Fonte dos valores")).toHaveValue(
    /Open Food Facts/,
  );
  await expect(row.getByLabel("Carboidratos (g)", { exact: true })).toHaveValue(
    "0",
  );
  await row.getByLabel("Calorias (kcal)", { exact: true }).fill("45");
  await expect(row.getByText("≈ 45 kcal", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await row
      .getByLabel("Calorias (kcal)", { exact: true })
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThan(180);
  await row.screenshot({
    path: "artifacts/online-food-review/automatic-row-320.png",
  });
  await row
    .getByRole("button", { name: "Retirar desta refeição", exact: true })
    .click();
  await expect(row.getByText("Fora do cálculo", { exact: true })).toBeVisible();
  await row
    .getByRole("button", { name: "Incluir nesta refeição", exact: true })
    .click();
  await expect(row.getByText("≈ 45 kcal", { exact: true })).toBeVisible();
  const meal = page.locator("details.plan-meal").first();
  const summary = meal.locator(":scope > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(row).not.toBeVisible();
  await expect(summary).toContainText("Refeição 1");
  await meal.screenshot({
    path: "artifacts/online-food-review/meal-collapsed-320.png",
  });
  await summary.click();
  await expect(row.getByText("≈ 45 kcal", { exact: true })).toBeVisible();
  await page.getByLabel("Revisei a extração", { exact: false }).check();
  await page
    .getByRole("button", { name: "Salvar versão do plano", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Plano salvo com sucesso" });
  await expect(dialog).toBeVisible();
  await dialog.screenshot({
    path: "artifacts/online-food-review/save-success-320.png",
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole("button", { name: "Entendi", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("Plano salvo");
  await expect(
    page.getByLabel("Versões salvas", { exact: false }),
  ).toBeVisible();
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .getByLabel("Data do consumo para comparar")
        .evaluate((e) => e.getBoundingClientRect().width),
    ).toBeGreaterThan(200);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".plan-filter")
    .screenshot({ path: "artifacts/online-food-review/saved-filter-390.png" });
  await page.goto("/painel");
  const comparison = page.locator(".dashboard-diet-comparison");
  await expect(comparison).toContainText("503,5 kcal");
  await expect(
    comparison
      .locator("div")
      .filter({
        has: page.locator("dt", { hasText: "Refeições com registros" }),
      })
      .locator("dd"),
  ).toHaveText("0");
  await expect(comparison).toContainText("Não informadas");
  await page.goto("/painel/alimentacao");
  for (const [index, category] of [
    "breakfast",
    "breakfast",
    "lunch",
  ].entries()) {
    if (
      !(await page
        .locator(".record-create")
        .evaluate((e) => (e as HTMLDetailsElement).open))
    )
      await page.locator(".record-create > summary").click();
    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Salvar registro", exact: true }),
    });
    await form
      .getByLabel("Alimento", { exact: true })
      .fill(`Alimento QA ${index}`);
    await form.getByLabel("Quantidade consumida", { exact: true }).fill("100");
    await form
      .getByRole("combobox", { name: "Refeição", exact: true })
      .selectOption(category);
    const composition = form.locator(".manual-food-details");
    if (!(await composition.evaluate((e) => (e as HTMLDetailsElement).open)))
      await composition.locator(":scope > summary").click();
    await form.getByLabel("Calorias (kcal)", { exact: true }).fill("0");
    await form
      .getByRole("button", { name: "Salvar registro", exact: true })
      .click();
    await expect(
      page.getByRole("article", { includeHidden: true }),
    ).toHaveCount(index + 1);
    await expect(
      form.getByRole("button", { name: "Salvar registro", exact: true }),
    ).toBeDisabled();
  }
  await page.goto("/painel");
  await expect(
    comparison
      .locator("div")
      .filter({
        has: page.locator("dt", { hasText: "Refeições com registros" }),
      })
      .locator("dd"),
  ).toHaveText("2");
  await expect(comparison).toContainText("0 kcal");
  await expect(comparison).toContainText("-503,5 kcal");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await comparison.screenshot({
    path: "artifacts/online-food-review/dashboard-comparison-390.png",
  });
});

test("consulta online bloqueia visitante e origem externa sem consultar o provedor", async ({
  request,
}) => {
  const noSession = await request.post("/api/alimentos/online", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { kind: "search", query: "produto fictício" },
  });
  expect(noSession.status()).toBe(401);
  expect(noSession.headers()["cache-control"]).toContain("no-store");
  const foreign = await request.post("/api/alimentos/online", {
    headers: { Origin: "https://other.example" },
    data: { kind: "search", query: "produto fictício" },
  });
  expect(foreign.status()).toBe(403);
});
