import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("semana de atividades e cards expansíveis preservam métricas e edição", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("activity-cards@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Semana de atividades QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/atividades");
  await page.locator(".record-create > summary").click();
  const create = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar registro", exact: true }),
  });
  await create
    .getByLabel("Título (opcional)", { exact: true })
    .fill("Corrida de teste");
  await create
    .getByRole("combobox", { name: "Modalidade", exact: true })
    .selectOption("running");
  await create.getByLabel("Duração (minutos)").fill("30");
  await create.getByLabel("Distância (km)").fill("5");
  await create.getByLabel("Calorias da atividade (kcal, opcional)").fill("300");
  await create
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 sessões na semana", exact: true }),
  ).toBeVisible();
  const card = page
    .locator("article.activity-record")
    .filter({ hasText: "Corrida de teste" });
  await expect(card.locator(".activity-record-details")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(card.locator(".activity-record-main")).toContainText("5");
  await expect(card.locator(".activity-record-metrics")).toContainText(
    "30 min",
  );
  await expect(card.locator(".activity-record-metrics")).toContainText(
    "300 kcal",
  );
  await expect(
    card.getByText("Editar registro", { exact: true }),
  ).not.toBeVisible();
  await card.locator(".activity-record-details > summary").click();
  await card.getByText("Editar registro", { exact: true }).click();
  await card.getByLabel("Calorias da atividade (kcal, opcional)").fill("0");
  await card
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(card.locator(".activity-record-metrics")).toContainText(
    "0 kcal",
  );
  const week = page.getByRole("navigation", { name: "Atividades da semana" });
  await expect(week.locator(".has-records")).toHaveCount(1);
  await expect(week.locator('[aria-current="date"]')).toHaveAttribute(
    "href",
    /\/painel\/historico\?data=/,
  );
  await page.setViewportSize({ width: 320, height: 844 });
  const cardWidth = (await card.boundingBox())!.width;
  expect(
    (await card.locator(".activity-record-details > summary").boundingBox())!
      .width,
  ).toBeGreaterThan(cardWidth - 50);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await card.locator(".activity-record-details > summary").click();
  await card.screenshot({ path: "artifacts/activity-record-card-320.png" });
  await page
    .locator(".activity-week-summary")
    .screenshot({ path: "artifacts/activity-week-320.png" });
});
