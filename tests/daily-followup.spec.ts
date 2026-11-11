import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("fases, check-in opcional, contexto sem consumo e indicadores ocultos preservam dados", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("daily@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Acompanhamento QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  const date = await page.getByLabel("Início", { exact: true }).inputValue();
  const shift = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel");
  await page.getByRole("link", { name: "Configurar fases" }).click();
  await page.getByText("Adicionar fase", { exact: true }).click();
  const phase = page.locator("form").filter({
    has: page.getByRole("button", { name: "Criar fase", exact: true }),
  });
  await phase.getByLabel("Nome da fase", { exact: true }).fill("Base e rotina");
  await phase.getByLabel("Início da fase").fill(date);
  await phase.getByLabel("Fim da fase").fill(shift(10));
  await phase
    .getByLabel("Objetivo desta fase")
    .fill("Construir consistência sem cobrança");
  await phase.getByLabel("Próximo marco (opcional)").fill("Primeira revisão");
  await phase.getByLabel("Data do marco").fill(shift(3));
  await phase.getByRole("button", { name: "Criar fase", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await page.goto("/painel");
  await expect(page.locator(".day-phase")).toContainText("Base e rotina");
  await expect(page.locator(".day-phase")).toContainText("Primeira revisão");
  await page.locator(".day-checkin-link").click();
  const checkin = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar check-in", exact: true }),
  });
  await checkin
    .getByRole("combobox", { name: "Fadiga", exact: true })
    .selectOption("0");
  await checkin.getByLabel("Horas de sono", { exact: false }).fill("0");
  await checkin
    .getByRole("button", { name: "Salvar check-in", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(page.locator(".daily-perceptions")).toContainText("Nenhuma");
  await expect(page.locator(".daily-perceptions")).toContainText("0 h");
  await expect(page.locator(".daily-perceptions")).toContainText(
    "Não informado",
  );
  await page.getByText("Adicionar contexto alimentar", { exact: true }).click();
  const eating = page.locator("form").filter({
    has: page.getByRole("button", {
      name: "Registrar contexto",
      exact: true,
    }),
  });
  await eating
    .getByRole("combobox", {
      name: "Como quero registrar este momento?",
      exact: true,
    })
    .selectOption("social");
  await eating
    .getByText("Fome, saciedade e contexto (opcional)", { exact: true })
    .click();
  await eating.getByLabel("Fome antes").fill("0");
  await eating
    .getByLabel("O que gostaria de anotar?")
    .fill("Encontro com amigos");
  await eating
    .getByRole("button", { name: "Registrar contexto", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(page.locator(".daily-context-list")).toContainText(
    "Refeição social",
  );
  await expect(page.locator(".daily-context-list")).toContainText("Fome: 0");
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.daily_checkins).toHaveLength(1);
  expect(exported.eating_context_events).toHaveLength(1);
  expect(exported.project_phases).toHaveLength(1);
  expect(exported.meal_items).toHaveLength(0);
  await page.goto(`/painel/historico?data=${date}`);
  await expect(
    page
      .locator(".history-group")
      .filter({ has: page.locator("summary strong", { hasText: "Check-in" }) }),
  ).toContainText("1 registro");
  await page.goto("/painel/perfil");
  const settings = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "O que quero ver no meu dashboard",
    }),
  });
  await settings.getByLabel("Mostrar peso", { exact: true }).uncheck();
  await settings.getByLabel("Mostrar calorias", { exact: true }).uncheck();
  await settings
    .getByLabel("Mostrar acesso às fotos", { exact: true })
    .uncheck();
  await settings
    .getByRole("button", { name: "Salvar preferências", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await page.goto("/painel");
  await expect(page.locator(".metric-peso")).toHaveCount(0);
  await expect(page.locator(".daily-nutrition")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Fotografias privadas", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".day-checkin-link")).toContainText(
    "Meu check-in foi registrado",
  );
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("diazen-dashboard")))
    .not.toBeNull();
  const snapshot = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("diazen-dashboard")!),
  );
  expect(JSON.stringify(snapshot.items)).not.toMatch(/kcal| kg|Peso|Fotos/);
  expect(JSON.stringify(snapshot)).not.toContain("Encontro com amigos");
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator(".day-overview")
    .screenshot({ path: "artifacts/daily-overview-320.png" });
  await page.goto("/painel/acompanhamento");
  await page.getByText("Adicionar contexto alimentar", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Registrar contexto", exact: true }),
  ).toBeEnabled();
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Registrar contexto", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.goto("/painel/alimentacao");
  await page.locator(".manual-meal-recorder > summary").click();
  const manual = page.locator(".manual-meal-recorder");
  await manual.getByLabel("Alimento", { exact: true }).fill("Arroz branco");
  await manual.getByLabel("Quantidade consumida", { exact: true }).fill("100");
  await expect(manual.locator(".meal-total")).toContainText("128 kcal");
  await manual.locator('select[name="unit"]').selectOption("unit");
  await expect(manual.locator('input[name="kcal"]')).toHaveValue("");
  await expect(manual.locator(".meal-total")).toContainText(
    "calorias pendentes",
  );
  await manual
    .getByText("Conferir composição e fonte", { exact: true })
    .click();
  await manual
    .getByLabel("Quantidade de referência na mesma unidade")
    .fill("1");
  await manual.getByLabel("Calorias (kcal)", { exact: true }).fill("50");
  await manual.getByLabel("Quantidade consumida", { exact: true }).fill("2");
  await expect(manual.locator(".meal-total")).toContainText("100 kcal");
  await manual
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.meal_items).toHaveLength(1);
  expect(after.meal_items[0].unit).toBe("unit");
  expect(after.display_preferences[0].show_weight).toBe(false);
});
