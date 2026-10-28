import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("Garmin pessoal: consulta compacta, feedback, calorias ausentes e limpeza", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120000);
  let sleepRevision: string | null = null;
  await page.route("**/api/garmin/sync", (route) =>
    route.fulfill({
      json: {
        imported: 0,
        sleep_updated: 0,
        sleep_checked: false,
        sleep_revision: sleepRevision,
      },
    }),
  );
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
  let automatic = true;
  await page.route("**/api/garmin/settings", async (route) => {
    if (route.request().method() === "POST")
      automatic = route.request().postDataJSON().enabled;
    await route.fulfill({
      json: {
        enabled: automatic,
        auto_after: "2026-10-25T00:00:00Z",
        last_success_at: null,
      },
    });
  });
  await page.route("**/api/garmin/import", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ ids: ["101"] });
    await route.fulfill({
      json: { results: [{ externalId: "101", status: "imported" }] },
    });
  });
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
  await expect(section.locator(".garmin-panel-details")).toHaveAttribute(
    "open",
    "",
  );
  const exportedBefore = await page.request.get("/api/exportar");
  expect(exportedBefore.status()).toBe(200);
  const before = await exportedBefore.json();
  expect(Array.isArray(before.garmin_imports)).toBe(true);
  expect(Array.isArray(before.garmin_sync_settings)).toBe(true);
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
  await expect(section.locator(".garmin-activity-details[open]")).toHaveCount(
    0,
  );
  await section.locator(".garmin-activity-details > summary").first().click();
  await expect(
    section
      .getByRole("link", { name: "Ver no Garmin Connect", exact: false })
      .first(),
  ).toHaveAttribute("href", "https://connect.garmin.com/modern/activity/101");
  await expect(section).toContainText("30 min");
  await expect(section).toContainText("5 km");
  await section
    .getByRole("checkbox", { name: "Selecionar Corrida fictícia", exact: true })
    .check();
  await section
    .getByRole("button", { name: "Importar selecionadas (1)", exact: true })
    .click();
  await expect(section.getByRole("status")).toContainText(
    "1 atividade importada",
  );
  await expect(
    section.locator("li").filter({ hasText: "Corrida fictícia" }),
  ).toContainText("Registrada no diário");
  await section
    .getByRole("checkbox", {
      name: "Importar automaticamente novas atividades",
      exact: true,
    })
    .uncheck();
  await expect(section.getByRole("status")).toContainText(
    "Importação automática pausada",
  );

  await page.unroute("**/api/garmin/activities");
  await page.route("**/api/garmin/activities", async (route) => {
    await route.fulfill({
      status: 502,
      json: { message: "Falha temporária na Garmin. Tente novamente." },
    });
  });
  await section
    .getByRole("button", {
      name: "Consultar atividades da Garmin",
      exact: true,
    })
    .click();
  await expect(section.getByRole("alert")).toContainText("Falha temporária");
  await expect(
    section.getByText("Corrida fictícia", { exact: true }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.activities).toEqual(before.activities);
  expect(after.meal_items).toEqual(before.meal_items);
  await page.setViewportSize({ width: 320, height: 844 });
  const panelWidth = (await section.boundingBox())!.width;
  expect(
    (await section.locator(".garmin-panel-summary").boundingBox())!.width,
  ).toBeGreaterThan(panelWidth - 50);
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
  await page.goto("/painel");
  await page.goto("/painel/atividades");
  await expect(section.locator(".garmin-panel-details")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(
    section.getByRole("button", {
      name: "Consultar atividades da Garmin",
      exact: true,
    }),
  ).not.toBeVisible();
  await section.locator(".garmin-panel-summary").click();
  await expect(
    section.getByRole("button", {
      name: "Consultar atividades da Garmin",
      exact: true,
    }),
  ).toBeVisible();
  // Dados sintéticos entram pelas RPCs administrativas do laboratório, nunca pela Garmin real.
  const owner = "00000000-0000-4000-8000-000000000018";
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const rpc = async (name: string, data: unknown) => {
    const response = await request.post(
      `http://127.0.0.1:54329/rest/v1/rpc/${name}`,
      { headers: { apikey: "chave-secreta-de-teste" }, data },
    );
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const seed = await request.post(
    "http://127.0.0.1:54329/rest/v1/garmin_sleep_settings",
    {
      headers: { apikey: "chave-secreta-de-teste" },
      data: { user_id: owner, enabled: true },
    },
  );
  expect(seed.ok()).toBe(true);
  const claim = await rpc("garmin_claim_sleep", { p_user: owner });
  await rpc("garmin_store_sleep", {
    p_user: owner,
    p_lease: claim.lease,
    p_data: {
      date,
      total_seconds: 27000,
      nap_seconds: 0,
      light_seconds: 18000,
      deep_seconds: 3600,
      rem_seconds: 5400,
      awake_seconds: null,
      score: 82,
    },
  });
  await rpc("garmin_finish_sleep", {
    p_user: owner,
    p_lease: claim.lease,
    p_success: true,
  });
  await page.goto("/painel/sono");
  const sleep = page.getByRole("region", { name: "Sono da Garmin" });
  await expect(sleep.locator(".sleep-main-metrics")).toContainText(
    "7 h 30 min",
  );
  await expect(sleep.locator(".sleep-main-metrics")).toContainText("82/100");
  await expect(sleep.locator(".sleep-stage-grid")).toContainText(
    "Não informado",
  );
  const revised = await request.patch(
    `http://127.0.0.1:54329/rest/v1/sleep_records?user_id=eq.${owner}&logged_on=eq.${date}`,
    {
      headers: { apikey: "chave-secreta-de-teste" },
      data: {
        total_seconds: 28800,
        score: 88,
        updated_at: new Date().toISOString(),
      },
    },
  );
  expect(revised.ok()).toBe(true);
  sleepRevision = "revision-from-cron";
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(sleep.locator(".sleep-main-metrics")).toContainText(
    "8 h 00 min",
  );
  await expect(sleep.locator(".sleep-main-metrics")).toContainText("88/100");

  const toggle = sleep.getByRole("checkbox", {
    name: "Sincronizar meu sono com a Garmin",
  });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
  await expect(sleep).toContainText("histórico foi preservado");
  await expect(sleep.locator(".sleep-main-metrics")).toContainText(
    "8 h 00 min",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await sleep.screenshot({ path: "artifacts/garmin-sleep-320.png" });
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.sleep_records).toHaveLength(1);
  expect(exported.garmin_sleep_settings[0].enabled).toBe(false);
  expect(exported.garmin_sleep_settings[0].lease_id).toBeUndefined();
  await page.goto(`/painel/historico?data=${date}`);
  await expect(
    page
      .locator(".history-group")
      .filter({ has: page.locator("summary strong", { hasText: "Sono" }) }),
  ).toContainText("1 registro");
  await page.goto("/painel");
  await expect(
    page.getByRole("region", { name: "Sono da Garmin" }),
  ).toContainText("8 h 00 min");
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
