import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("Garmin pessoal: consulta compacta, feedback, calorias ausentes e limpeza", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  expect(
    (
      await page.request.post("/api/garmin/activities", {
        headers: { origin: "http://127.0.0.1:3100" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post("/api/garmin/activities", {
        headers: { origin: "https://foreign.invalid" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("garmin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Garmin QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  let complete: (() => void) | undefined;
  await page.route("**/api/garmin/activities", async (route) => {
    await new Promise<void>((resolve) => {
      complete = resolve;
    });
    await route.fulfill({
      json: {
        activities: [
          {
            id: "101",
            name: "Corrida fictícia",
            sport: "running",
            date: "2026-10-25 08:00:00",
            seconds: 1800,
            metres: 5000,
            calories: 0,
          },
          {
            id: "102",
            name: "Treino fictício",
            sport: "strength_training",
            date: "2026-10-25 10:00:00",
            seconds: 1200,
            metres: null,
            calories: null,
          },
        ],
      },
    });
  });
  await page.goto("/painel/atividades");
  await expect(page.getByText("Sua conta Strava", { exact: true })).toHaveCount(
    0,
  );
  const section = page.getByRole("region", { name: "Atividades da Garmin" });
  await expect(section).toBeVisible();
  const before = await (await page.request.get("/api/exportar")).json();
  await section
    .getByRole("button", {
      name: "Consultar atividades da Garmin",
      exact: true,
    })
    .click();
  await expect(section.getByRole("status")).toContainText(
    "Consultando suas atividades",
  );
  await expect(
    section.getByRole("button", { name: "Buscando atividades…", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => Boolean(complete)).toBe(true);
  complete!();
  await expect(
    section.getByText("Corrida fictícia", { exact: true }),
  ).toBeVisible();
  await expect(
    section.locator("li").filter({ hasText: "Corrida fictícia" }),
  ).toContainText("0 kcal");
  await expect(
    section.locator("li").filter({ hasText: "Treino fictício" }),
  ).toContainText("Sem calorias informadas");
  await expect(section.locator("details[open]")).toHaveCount(0);
  await section.locator("summary").first().click();
  await expect(
    section
      .getByRole("link", { name: "Ver no Garmin Connect", exact: false })
      .first(),
  ).toHaveAttribute("href", "https://connect.garmin.com/modern/activity/101");
  await expect(section).toContainText("30 min");
  await expect(section).toContainText("5 km");
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
  await section.screenshot({ path: "artifacts/garmin-activities-320.png" });
  await context.setOffline(true);
  await expect(
    section.getByRole("button", {
      name: "Consultar atividades da Garmin",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(section.locator(".garmin-activities")).toHaveCount(0);
  await context.setOffline(false);
  await section
    .getByRole("button", { name: "Limpar consulta", exact: true })
    .click();
  await expect(section.locator("li")).toHaveCount(0);
  await context.addCookies([
    {
      name: "diazen-strava-session",
      value: "legacy-synthetic",
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
    (await context.cookies()).filter((c) =>
      c.name.startsWith("diazen-strava-"),
    ),
  ).toHaveLength(0);
});
