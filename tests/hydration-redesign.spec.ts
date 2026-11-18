import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("hidratação v2: recipiente privado, consumo, histórico preservado e temas", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const auth = await page.request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    {
      data: { email: "water-v2@example.test", password: "senha-de-teste-123" },
    },
  );
  const session = await auth.json();
  const headers = {
    authorization: `Bearer ${session.access_token}`,
    apikey: "sb_publishable_teste",
  };
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("water-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/agua/recipientes");
  await expect(
    page.getByRole("heading", { name: "Seus recipientes", exact: true }),
  ).toBeVisible();
  await page.getByText("Adicionar recipiente", { exact: true }).click();
  const create = page.locator("#recipientes form").filter({
    has: page.getByRole("button", { name: "Salvar recipiente", exact: true }),
  });
  await create
    .getByLabel("Nome do recipiente", { exact: true })
    .fill("Garrafa do treino");
  await create
    .getByLabel("Volume do recipiente (ml)", { exact: true })
    .fill("750");
  await create
    .getByRole("button", { name: "Salvar recipiente", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Recipiente salvo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(page.locator("#recipientes")).toContainText(
    "Garrafa do treino · 750 ml",
  );
  const response = await page.request.post(
    "http://127.0.0.1:54329/rest/v1/rpc/create_project",
    {
      headers,
      data: {
        p_name: "Projeto de Hidratação",
        p_starts_on: shift(-6),
        p_ends_on: shift(180),
        p_water_ml: 4000,
        p_sessions: 3,
      },
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  const accountAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accountAudit.violations).toEqual([]);
  await page.goto("/painel/agua");
  await expect(
    page.getByRole("heading", { name: "Hidratação", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Registrar consumo", exact: true })
    .click();
  const form = page.locator("#novo-registro form");
  await form
    .getByRole("combobox", { name: "Recipiente salvo", exact: true })
    .selectOption({ label: "Garrafa do treino · 750 ml" });
  await expect(form.getByLabel("Volume (ml)", { exact: true })).toHaveValue(
    "750",
  );
  await expect(
    form.getByLabel("Recipiente (opcional)", { exact: true }),
  ).toHaveValue("Garrafa do treino");
  await form.getByLabel("Horário (opcional)", { exact: true }).fill("08:15");
  await form
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Registro adicionado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(form.getByLabel("Volume (ml)", { exact: true })).toHaveValue("");
  await expect(page.locator(".water-day-summary")).toContainText("0,75 L");
  await page.locator("#recipientes > summary").click();
  const container = page
    .locator(".water-container-list > li")
    .filter({ hasText: "Garrafa do treino" });
  await container
    .getByText("Excluir recipiente Garrafa do treino", { exact: true })
    .click();
  const removal = page.getByRole("region", {
    name: "Excluir recipiente Garrafa do treino",
    exact: true,
  });
  await removal.getByRole("checkbox").check();
  await removal
    .getByRole("button", { name: "Excluir recipiente", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Recipiente excluído");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.water_containers).toHaveLength(0);
  expect(exported.water_entries).toHaveLength(1);
  expect(exported.water_entries[0]).toMatchObject({
    volume_ml: 750,
    container_label: "Garrafa do treino",
    logged_time: "08:15:00",
  });
  const project = exported.projects.find(
    (p: { status: string }) => p.status === "ACTIVE",
  ).id;
  const demo = await page.request.post(
    "http://127.0.0.1:54329/rest/v1/water_entries",
    {
      headers,
      data: [
        ...[250, 500, 500, 500].map((volume_ml, index) => ({
          project_id: project,
          logged_on: date,
          volume_ml,
          logged_time: ["10:20", "13:10", "16:45", "19:30"][index],
        })),
        ...[3200, 3600, 2800, 4000, 3700, 4100].map((volume_ml, index) => ({
          project_id: project,
          logged_on: shift(index - 6),
          volume_ml,
          logged_time: "12:00",
        })),
      ],
    },
  );
  expect(demo.ok(), await demo.text()).toBe(true);
  await page.goto("/painel/agua");
  await expect(
    page.getByRole("heading", { name: "Hidratação", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".water-ring-volume")).toHaveText("2,5 L");
  await expect(page.locator(".water-record-list > article")).toHaveCount(5);
  await expect(page.locator(".water-record-time")).toHaveText([
    "08:15",
    "10:20",
    "13:10",
    "16:45",
    "19:30",
  ]);
  const folder = `artifacts/diazen-v2/hydration-fiel/${info.project.name}`;
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
        fullPage: true,
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
  await page.getByRole("link", { name: "250 ml", exact: true }).click();
  const quick = page.locator("#novo-registro form");
  await expect(quick.getByLabel("Volume (ml)", { exact: true })).toHaveValue(
    "250",
  );
  for (const volume of ["250", "100"]) {
    await quick.getByLabel("Volume (ml)", { exact: true }).fill(volume);
    await quick
      .getByRole("button", { name: "Salvar registro", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Registro adicionado");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await expect(quick.getByLabel("Volume (ml)", { exact: true })).toHaveValue(
      "",
    );
  }
  const finalExport = await (await page.request.get("/api/exportar")).json();
  expect(finalExport.water_entries).toHaveLength(13);
  expect(
    new Set(finalExport.water_entries.map((r: { id: string }) => r.id)).size,
  ).toBe(13);
  await page.setViewportSize({ width: 320, height: 844 });
  const edited = page.locator(".water-record-list > article").filter({
    has: page.getByRole("heading", { name: "100 ml", exact: true }),
  });
  await edited.locator(".water-record-menu > summary").click();
  await edited.getByText("Editar registro", { exact: true }).click();
  await expect(edited.getByLabel("Volume (ml)", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const editAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(editAudit.violations).toEqual([]);
  await page.screenshot({
    path: `${folder}/edit-320.png`,
    animations: "disabled",
  });
  await edited.getByLabel("Volume (ml)", { exact: true }).fill("125");
  await edited
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(
    page
      .locator(".water-record-list > article")
      .getByRole("heading", { name: "125 ml", exact: true }),
  ).toBeVisible();
  const afterEdit = await (await page.request.get("/api/exportar")).json();
  expect(afterEdit.water_entries).toHaveLength(13);
  expect(
    afterEdit.water_entries.some(
      (r: { volume_ml: number }) => r.volume_ml === 125,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
