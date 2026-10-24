import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const form = (page: Page, button: string) =>
  page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button, exact: true }) });
test("registros persistem, substituem valores únicos e preservam desconhecidos", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90000);
  const capture = async (name: string) => {
    if (process.env.CAPTURE_REVIEW !== "1") return;
    const directory = join("artifacts", "visual-review", testInfo.project.name);
    await mkdir(directory, { recursive: true });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.screenshot({
        path: join(directory, `${name}-preenchido-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  };
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("registros@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Diário E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/agua");
  await page.locator(".record-create > summary").click();
  const water = form(page, "Salvar registro");
  await water.getByLabel("Volume (ml)").fill("300");
  await water
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "300 ml", exact: true, level: 2 }),
  ).toBeVisible();
  const item = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "300 ml", exact: true }),
  });
  await item.getByText("Editar registro", { exact: true }).click();
  await item.getByLabel("Volume (ml)").fill("450");
  await item
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "450 ml", exact: true }).first(),
  ).toBeVisible();
  await capture("agua");
  await page.goto("/painel/peso");
  await page.locator(".record-create > summary").click();
  const weight = form(page, "Salvar peso");
  await weight.getByLabel("Peso (kg)").fill("90");
  await weight
    .getByRole("button", { name: "Salvar peso", exact: true })
    .click();
  await expect(weight.getByRole("status")).toContainText("Peso salvo");
  await weight.getByLabel("Peso (kg)").fill("89.5");
  await weight
    .getByRole("button", { name: "Salvar peso", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "89,5 kg", exact: true }).first(),
  ).toBeVisible();
  await capture("peso");
  await page.goto("/painel/medidas");
  await page.locator(".record-create > summary").click();
  const measure = form(page, "Salvar medidas");
  await measure.getByLabel("Cintura (cm)", { exact: true }).fill("90");
  await measure
    .getByRole("button", { name: "Salvar medidas", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await capture("medidas");
  await page.goto("/painel/atividades");
  await page.locator(".record-create > summary").click();
  const activity = form(page, "Salvar registro");
  await activity.getByRole("button", { name: "Corrida", exact: true }).click();
  await expect(activity.getByLabel("Modalidade")).toHaveValue("running");
  await expect(
    activity.getByRole("button", { name: "Corrida", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await activity.getByLabel("Modalidade").selectOption("strength");
  await expect(
    activity.getByRole("button", { name: "Musculação", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await activity.getByLabel("Modalidade").selectOption("running");
  await activity.getByLabel("Duração (minutos)").fill("30");
  await activity
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(activity.getByRole("alert")).toContainText("exigem distância");
  await activity.getByLabel("Distância (km)").fill("5");
  await activity
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 sessões na semana" }),
  ).toBeVisible();
  await capture("atividades");
  await page.goto("/painel/alimentacao");
  await page.locator(".record-create > summary").click();
  const meal = form(page, "Salvar registro");
  await meal
    .getByLabel("Alimento", { exact: true })
    .fill("Alimento sem composição");
  await meal.getByLabel("Quantidade consumida", { exact: true }).fill("150");
  await meal
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.locator(".nutrition-grid").getByText("Não informado", { exact: true }),
  ).toHaveCount(4);
  await page.getByRole("button", { name: "Marcar dia como concluído" }).click();
  await expect(
    page.getByText("Dia concluído manualmente.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .getByText("Editar registro", { exact: true })
    .click();
  await page
    .getByRole("article")
    .getByLabel("Calorias (kcal)", { exact: true })
    .fill("0");
  await page
    .getByRole("article")
    .getByRole("button", { name: "Salvar alteração" })
    .click();
  await expect(
    page.locator(".nutrition-grid").getByText("0 kcal", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Dia ainda não confirmado.", { exact: false }),
  ).toBeVisible();
  await capture("alimentacao");
  await page.goto("/painel");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".dashboard-query")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Gerenciar projetos" }),
  ).toBeHidden();
  await expect(page.locator(".dashboard-hero")).toBeVisible();
  await expect(page.locator(".area-card.metric-agua")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.getByLabel("Projeto visualizado")).toBeHidden();
  await page
    .getByText("Alterar projeto ou data da consulta", { exact: true })
    .click();
  await expect(page.getByLabel("Projeto visualizado")).toBeVisible();
  await page.waitForFunction(
    () => sessionStorage.getItem("diazen-dashboard") !== null,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("/pagina-nao-armazenada");
  await expect(
    page.getByRole("heading", { name: "Você está sem conexão." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Diário E2E", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#metrics").getByText("450 ml", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const data = JSON.parse(sessionStorage.getItem("diazen-dashboard")!);
    data.expiresAt = 0;
    sessionStorage.setItem("diazen-dashboard", JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator("#summary")).toBeHidden();
  await context.setOffline(false);
  await page.goto("/painel");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".dashboard-query")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Gerenciar projetos" }),
  ).toBeHidden();
  await expect(page.locator(".dashboard-hero")).toBeVisible();
  await expect(page.locator(".area-card.metric-agua")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.getByLabel("Projeto visualizado")).toBeHidden();
  await page
    .getByText("Alterar projeto ou data da consulta", { exact: true })
    .click();
  await expect(page.getByLabel("Projeto visualizado")).toBeVisible();
  await page.waitForFunction(
    () => sessionStorage.getItem("diazen-dashboard") !== null,
  );
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.waitForFunction(
    () => sessionStorage.getItem("diazen-dashboard") === null,
  );
});
