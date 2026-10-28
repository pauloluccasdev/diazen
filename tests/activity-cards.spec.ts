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
  const startInput = page.getByLabel("Início", { exact: true });
  const currentDate = await startInput.inputValue();
  const previous = new Date(`${currentDate}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const previousDate = previous.toISOString().slice(0, 10);
  await startInput.fill(previousDate);
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
    /\/painel\/atividades\?data=/,
  );
  const currentHref = await week
    .locator('[aria-current="date"]')
    .getAttribute("href");
  const otherDay = week.locator('a:not([aria-current="date"])').first();
  if (await otherDay.count()) {
    await otherDay.click();
    await expect(page).toHaveURL(
      /\/painel\/atividades\?data=.*#registros-do-dia/,
    );
    await expect(page.locator("article.activity-record")).toHaveCount(0);
    await page.goto(currentHref!);
  }
  await week.locator('[aria-current="date"]').click();
  await expect(page).toHaveURL(
    /\/painel\/atividades\?data=.*#registros-do-dia/,
  );
  await expect(card).toBeVisible();
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
  await page.goto("/painel/peso");
  await page.locator(".record-create > summary").click();
  const weight = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar peso", exact: true }),
  });
  await weight.locator('input[name="logged_on"]').fill(previousDate);
  await weight.getByLabel("Peso (kg)").fill("94");
  await weight
    .getByRole("button", { name: "Salvar peso", exact: true })
    .click();
  await expect(weight.getByRole("status")).toContainText("Peso salvo");
  await weight.locator('input[name="logged_on"]').fill(currentDate);
  await weight.getByLabel("Peso (kg)").fill("92");
  await weight
    .getByRole("button", { name: "Salvar peso", exact: true })
    .click();
  await expect(weight.getByRole("status")).toContainText("Peso salvo");
  await page.goto("/painel");
  const activitySummary = page.locator(".metric-atividades");
  await expect(activitySummary).toContainText("30 min");
  await expect(activitySummary).toContainText("Corrida de teste");
  await expect(activitySummary).toContainText("5 km");
  await expect(activitySummary).toContainText("0 kcal");
  await expect(activitySummary).not.toContainText("sessões na semana");
  const weightCard = page.locator(".metric-peso");
  await expect(weightCard).toContainText("94 → 92 kg");
  await expect(weightCard).toContainText("-2 kg no período");
  await expect(
    weightCard.getByRole("img", { name: /Peso nas últimas 2 medições/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await weightCard.screenshot({
    path: "artifacts/dashboard-weight-comparison-320.png",
  });
  await page.goto(`/painel?data=${previousDate}`);
  await expect(activitySummary).toContainText("Sem atividades registradas");
  await expect(activitySummary).not.toContainText("30 min");
  await page.goto("/painel");
  await expect(weightCard).toContainText("92 kg");
  await expect(activitySummary).toContainText("30 min");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(async () => {
    const activityBox = await activitySummary.boundingBox();
    const weightBox = await weightCard.boundingBox();
    expect(activityBox).not.toBeNull();
    expect(weightBox).not.toBeNull();
    expect(Math.abs(activityBox!.y - weightBox!.y)).toBeLessThan(2);
    expect(Math.abs(activityBox!.width - weightBox!.width)).toBeLessThan(2);
  }).toPass();
  await page
    .locator(".area-grid")
    .screenshot({ path: "artifacts/dashboard-compact-cards-390.png" });
});
