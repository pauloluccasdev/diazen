import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("treinos v2: métricas reais, modalidades, registro, recentes e consulta", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (date: string, n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const weekday = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const date = shift(today, -weekday - 1);
  const auth = await page.request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    {
      data: {
        email: "training-v2@example.test",
        password: "senha-de-teste-123",
      },
    },
  );
  const session = await auth.json();
  const headers = {
    authorization: `Bearer ${session.access_token}`,
    apikey: "sb_publishable_teste",
  };
  async function post(table: string, data: unknown) {
    const r = await page.request.post(
      `http://127.0.0.1:54329/rest/v1/${table}`,
      { headers, data },
    );
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  }
  const project = await post("rpc/create_project", {
    p_name: "Projeto 30 Trincado",
    p_starts_on: shift(today, -60),
    p_ends_on: shift(today, 180),
    p_water_ml: 3000,
    p_sessions: 6,
  });
  await post("activities", [
    {
      project_id: project,
      logged_on: date,
      modality: "strength",
      duration_min: 70,
      kcal: 520,
      distance_km: null,
      name: "Superiores",
    },
    {
      project_id: project,
      logged_on: shift(date, -1),
      modality: "running",
      duration_min: 56,
      kcal: 680,
      distance_km: 10,
      name: "Corrida base",
    },
    {
      project_id: project,
      logged_on: shift(date, -2),
      modality: "cycling",
      duration_min: 90,
      kcal: 760,
      distance_km: 40.2,
      name: "Pedal Z2",
    },
    {
      project_id: project,
      logged_on: shift(date, -4),
      modality: "swimming",
      duration_min: 45,
      kcal: 402,
      distance_km: 1.8,
      name: "Técnica e aeróbico",
    },
    {
      project_id: project,
      logged_on: shift(date, -5),
      modality: "strength",
      duration_min: 70,
      kcal: null,
      distance_km: null,
      name: "Inferiores",
    },
    {
      project_id: project,
      logged_on: shift(date, -7),
      modality: "running",
      duration_min: 30,
      kcal: 100,
      distance_km: 5,
      name: "Base anterior",
    },
    {
      project_id: project,
      logged_on: shift(date, -10),
      modality: "strength",
      duration_min: 60,
      kcal: 200,
      distance_km: null,
      name: "Sessão anterior",
    },
  ]);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("training-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const url = `/painel/atividades?projeto=${project}&data=${date}`;
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Treinos", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Indicadores da semana" }),
  ).toContainText("5 h 31 min");
  await expect(
    page.locator(".training-stat").filter({ hasText: "Calorias informadas" }),
  ).toContainText("2.362 kcal");
  await expect(
    page.locator(".training-stat").filter({ hasText: "Calorias informadas" }),
  ).toContainText("Subtotal parcial");
  await expect(
    page
      .locator(".training-stat")
      .filter({ hasText: "Distância (corrida + bike)" }),
  ).toContainText("50,2 km");
  await expect(page.locator(".training-goal")).toContainText("5 de 6 treinos");
  await expect(page.locator(".training-recent > ul > li")).toHaveCount(4);
  const before = await (await page.request.get("/api/exportar")).json();
  const folder = `artifacts/diazen-v2/training-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Ativar modo escuro no desktop" })
        .click();
    for (const width of [1672, 1366]) {
      await page.setViewportSize({ width, height: 941 });
      await page.screenshot({
        path: `${folder}/${theme}-${width}.png`,
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  for (const width of [320, 390, 768, 1672]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 941 });
    await page.screenshot({
      path: `${folder}/viewport-${width}.png`,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.activities).toEqual(before.activities);
  await page
    .getByRole("navigation", { name: "Registrar por modalidade" })
    .getByRole("link", { name: "Corrida", exact: true })
    .click();
  const form = page.locator("#novo-registro form");
  await expect(form.getByRole("combobox", { name: "Modalidade" })).toHaveValue(
    "running",
  );
  await expect(
    form.getByRole("button", { name: "Corrida", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await form
    .getByLabel("Título (opcional)", { exact: true })
    .fill("Corrida QA");
  await form.getByLabel("Duração (minutos)", { exact: true }).fill("30");
  await form.getByLabel("Distância (km)", { exact: true }).fill("5");
  await form
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Registro adicionado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(
    form.getByLabel("Duração (minutos)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("navigation", { name: "Registrar por modalidade" })
    .getByRole("link", { name: "Natação", exact: true })
    .click();
  await expect(form.getByRole("combobox", { name: "Modalidade" })).toHaveValue(
    "swimming",
  );
  await form
    .getByLabel("Título (opcional)", { exact: true })
    .fill("Natação QA");
  await form.getByLabel("Duração (minutos)", { exact: true }).fill("20");
  await form.getByLabel("Distância (km)", { exact: true }).fill("1.2");
  await form
    .getByLabel("Calorias da atividade (kcal, opcional)", { exact: true })
    .fill("0");
  await form
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Registro adicionado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  const saved = await (await page.request.get("/api/exportar")).json();
  expect(saved.activities).toHaveLength(9);
  expect(
    saved.activities.find((r: { name: string }) => r.name === "Corrida QA")
      .kcal,
  ).toBeNull();
  const swimmingCalories = saved.activities.find(
    (r: { name: string }) => r.name === "Natação QA",
  ).kcal;
  expect(swimmingCalories).not.toBeNull();
  expect(Number(swimmingCalories)).toBe(0);
  // Recent entry from another day opens its real editable record, without copying it.
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Treinos", level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".training-records article")).toHaveCount(3);
  await page
    .locator(".training-recent")
    .getByRole("link", { name: "Editar treino Corrida base", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`data=${shift(date, -1)}.*atividade=`),
  );
  const editing = page.locator(".training-records article").filter({
    has: page.getByRole("heading", { name: "Corrida base", exact: true }),
  });
  await expect(
    editing.getByLabel("Duração (minutos)", { exact: true }),
  ).toHaveJSProperty("valueAsNumber", 56);
  await editing.getByLabel("Duração (minutos)", { exact: true }).fill("55");
  await editing
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(editing.getByRole("status")).toContainText(
    "Registro atualizado",
  );
  const editedExport = await (await page.request.get("/api/exportar")).json();
  expect(editedExport.activities).toHaveLength(9);
  expect(
    Number(
      editedExport.activities.find(
        (r: { name: string }) => r.name === "Corrida base",
      ).duration_min,
    ),
  ).toBe(55);
  const closeProject = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    { headers, data: { status: "COMPLETED" } },
  );
  expect(closeProject.ok()).toBe(true);
  await page.goto(url);
  await expect(page.locator(".readonly-note")).toContainText(
    "Histórico somente leitura",
  );
  await expect(page.locator("#novo-registro")).toHaveCount(0);
  await expect(page.locator(".training-recent-actions")).toHaveCount(0);
  await expect(page.locator(".training-records form")).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/exportar")).json()).activities,
  ).toEqual(editedExport.activities);
  const draft = await post("rpc/create_project", {
    p_name: "Rascunho de treinos",
    p_starts_on: shift(today, 7),
    p_ends_on: shift(today, 37),
    p_water_ml: 2000,
    p_sessions: 3,
    p_activate: false,
  });
  await page.goto(`/painel/atividades?projeto=${draft}&data=${date}`);
  await expect(page.locator(".readonly-note")).toContainText(
    "Rascunhos não recebem registros",
  );
  await expect(page.locator("#novo-registro")).toHaveCount(0);
  await expect(page.locator(".training-recent > ul > li")).toHaveCount(0);
  const emptyAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(emptyAudit.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${folder}/empty-draft-390.png`,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
