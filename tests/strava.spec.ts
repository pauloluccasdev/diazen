import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("Strava consulta separada, calorias ausentes, desconexão e limpeza no logout", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  expect((await page.request.get("/api/strava/activities")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/strava/connect", {
        headers: { origin: "https://foreign.invalid" },
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(403);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("strava@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Strava QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  let connected = false;
  await page.route("**/api/strava/activities", async (route) => {
    await route.fulfill({
      json:
        route.request().method() === "GET"
          ? { configured: true, connected }
          : {
              activities: [
                {
                  id: "101",
                  name: "Corrida fictícia",
                  sport: "Run",
                  date: "2026-10-25T08:00:00",
                  seconds: 1800,
                  metres: 5000,
                  calories: 0,
                },
                {
                  id: "102",
                  name: "Treino fictício",
                  sport: "WeightTraining",
                  date: "2026-10-25T10:00:00",
                  seconds: 1200,
                  metres: null,
                  calories: null,
                },
              ],
            },
    });
  });
  await page.route("**/api/strava/disconnect", async (route) => {
    connected = false;
    await route.fulfill({
      json: { message: "Strava desconectado deste navegador." },
    });
  });
  await page.goto("/painel/atividades");
  const strava = page.getByRole("region", { name: "Sua conta Strava" });
  await expect(
    strava.getByRole("button", { name: "Conectar ao Strava", exact: true }),
  ).toBeVisible();
  await expect(
    strava.locator('form[action="/api/strava/connect"]'),
  ).toHaveAttribute("method", "post");
  const before = await (await page.request.get("/api/exportar")).json();
  connected = true;
  await page.reload();
  await strava
    .getByRole("button", {
      name: "Consultar atividades do Strava",
      exact: true,
    })
    .click();
  await expect(
    strava.getByRole("heading", { name: "Corrida fictícia" }),
  ).toBeVisible();
  await expect(
    strava.locator("li").filter({ hasText: "Corrida fictícia" }),
  ).toContainText("0 kcal");
  await expect(
    strava.locator("li").filter({ hasText: "Treino fictício" }),
  ).toContainText("Não informadas");
  await expect(
    strava.getByRole("link", { name: "View on Strava", exact: false }).first(),
  ).toHaveAttribute("href", "https://www.strava.com/activities/101");
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.activities).toEqual(before.activities);
  expect(after.meal_items).toEqual(before.meal_items);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await strava.screenshot({ path: "artifacts/strava-activities-320.png" });
  await context.setOffline(true);
  await expect(
    strava.getByRole("button", {
      name: "Consultar atividades do Strava",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(strava.locator(".strava-activities")).toHaveCount(0);
  await context.setOffline(false);
  await strava
    .getByRole("button", { name: "Desconectar Strava", exact: true })
    .click();
  await expect(
    strava.getByRole("button", { name: "Conectar ao Strava", exact: true }),
  ).toBeVisible();
  await expect(strava.locator("li")).toHaveCount(0);
  await context.addCookies([
    {
      name: "diazen-strava-session",
      value: "synthetic-cookie",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
    },
    {
      name: "diazen-strava-state",
      value: "synthetic-state",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
    },
  ]);
  await page.goto("/painel");
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("diazen-strava-"),
    ),
  ).toHaveLength(0);
});
