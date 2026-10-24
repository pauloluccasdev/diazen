import { test, expect } from "@playwright/test";
import { dietPdf } from "./fixtures/diet-pdf.mjs";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("alimento tem resumo, troca explícita e referência online automática e editável por porção", async ({
  page,
}) => {
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
