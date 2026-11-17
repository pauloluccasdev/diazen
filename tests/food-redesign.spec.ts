import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
test("alimentação v2: seis categorias, temas, calendário, inclusão contextual e totais além de mil itens", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const exceptions: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  const auth = await page.request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    { data: { email: "food-v2@example.test", password: "senha-de-teste-123" } },
  );
  const session = await auth.json();
  expect(session.access_token).toBeTruthy();
  const headers = {
    authorization: `Bearer ${session.access_token}`,
    apikey: "sb_publishable_teste",
  };
  const rest = async (table: string, data: unknown) => {
    const r = await page.request.post(
      `http://127.0.0.1:54329/rest/v1/${table}`,
      { headers, data },
    );
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  };
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const history = await rest("rpc/create_project", {
    p_name: "Histórico alimentar sintético",
    p_starts_on: shift(-60),
    p_ends_on: shift(180),
    p_water_ml: 2500,
    p_sessions: 3,
  });
  expect(
    (
      await page.request.patch(
        `http://127.0.0.1:54329/rest/v1/projects?id=eq.${history}`,
        { headers, data: { status: "COMPLETED" } },
      )
    ).ok(),
  ).toBe(true);
  const project = await rest("rpc/create_project", {
    p_name: "Projeto 30 Trincado",
    p_starts_on: shift(-30),
    p_ends_on: shift(300),
    p_water_ml: 2500,
    p_sessions: 4,
  });
  const foods: [string, string, number, number][] = [
    ["breakfast", "Ovo mexido", 100, 143],
    ["breakfast", "Pão integral", 50, 128],
    ["morning_snack", "Banana", 100, 89],
    ["morning_snack", "Aveia em flocos", 30, 114],
    ["lunch", "Peito de frango grelhado", 150, 248],
    ["lunch", "Arroz integral", 100, 124],
    ["lunch", "Salada verde", 60, 20],
    ["afternoon_snack", "Tapioca", 50, 118],
    ["afternoon_snack", "Atum em água", 120, 132],
    ["dinner", "Macarrão integral", 80, 284],
    ["dinner", "Carne moída magra", 120, 185],
    ["dinner", "Molho de tomate", 40, 25],
  ];
  await rest(
    "meal_items",
    foods.map(([category, name, amount, kcal]) => ({
      project_id: project,
      logged_on: date,
      category,
      name,
      amount,
      reference_amount: amount,
      unit: "g",
      kcal,
      protein: 8,
      carbs: 15,
      fat: 4,
      source: "Fixture visual isolada; não é prescrição",
    })),
  );
  await rest("diet_plans", {
    project_id: project,
    title: "Referência sintética do laboratório",
    effective_from: shift(-30),
    document: {
      version: 1,
      title: "Referência sintética do laboratório",
      meals: [
        {
          name: "Referência diária",
          option: 1,
          conditional: false,
          enabled: true,
          groups: [
            {
              included: true,
              selected: 0,
              choices: [
                {
                  name: "Referência sintética",
                  amount: 1,
                  unit: "portion",
                  tacoId: null,
                  values: { kcal: 2500, protein: 150, carbs: 300, fat: 80 },
                },
              ],
            },
          ],
        },
      ],
    },
  });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("food-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/alimentacao");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Alimentação", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".meal-record-group")).toHaveCount(6);
  await expect(
    page.locator(".meal-record-group[data-recorded=true]"),
  ).toHaveCount(5);
  await expect(page.locator(".food-energy-value strong")).toHaveText(
    "1.610 kcal",
  );
  await expect(page.locator(".food-macro-protein")).toContainText("96 g");
  await expect(
    page.getByRole("group", { name: "Ceia", exact: true }),
  ).toContainText("Nenhum registro ainda");
  const folder = `artifacts/diazen-v2/food-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const audits: unknown[] = [];
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Ativar modo escuro no desktop" })
        .click();
    for (const width of [1536, 1366]) {
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1024,
      });
      await page.screenshot({
        path: `${folder}/${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme} overflow ${width}`,
      ).toBe(true);
    }
    audits.push({
      theme,
      violations: (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    });
  }
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
    await page.screenshot({
      path: `${folder}/mobile-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width === 390)
      await page.screenshot({
        path: `${folder}/viewport-390.png`,
        animations: "disabled",
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `mobile overflow ${width}`,
    ).toBe(true);
    audits.push({
      width,
      violations: (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    });
  }
  expect(audits).toEqual(
    audits.map((record) => ({ ...(record as object), violations: [] })),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("link", { name: "Adicionar alimento: Ceia", exact: true })
    .click();
  const recorder = page.locator(".manual-meal-recorder");
  await expect(recorder).toHaveAttribute("open", "");
  await expect(
    recorder.getByRole("combobox", { name: "Refeição", exact: true }),
  ).toHaveValue("supper");
  await expect(recorder.getByLabel("Data", { exact: true })).toHaveValue(date);
  await page.goto("/painel/alimentacao?registrar=1");
  await expect(recorder).toHaveAttribute("open", "");
  await recorder.locator(":scope > summary").click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator(".food-desktop-add").click();
  await expect(recorder).toHaveAttribute("open", "");
  await expect(page).toHaveURL(/registrar=1$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/painel/alimentacao");
  await page.getByRole("button", { name: "Escolher data do diário" }).click();
  await expect(page.getByLabel("Escolher data", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".dz-module-heading-wrap .dz-date-navigator details"),
  ).not.toHaveAttribute("open", "");
  await rest(
    "meal_items",
    Array.from({ length: 1005 }, (_, i) => ({
      project_id: project,
      logged_on: shift(-1),
      category: "lunch",
      name: `Item sintético ${i}`,
      amount: 1,
      reference_amount: 1,
      unit: "g",
      kcal: i === 0 ? null : 1,
      protein: null,
      carbs: null,
      fat: null,
      source: "Fixture de paginação isolada",
    })),
  );
  const before = await (await page.request.get("/api/exportar")).json();
  await page.getByRole("button", { name: "Escolher data do diário" }).click();
  await page.getByLabel("Escolher data", { exact: true }).fill(shift(-1));
  await page
    .getByRole("button", { name: "Consultar data", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`data=${shift(-1)}`));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${folder}/partial-390.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1366, height: 768 });
  const lunch = page.getByRole("group", { name: "Almoço", exact: true });
  await expect(lunch.locator(".food-meal-identity")).toContainText(
    "1005 alimentos",
  );
  await expect(lunch.locator(".food-meal-energy")).toContainText("1.004 kcal");
  await expect(lunch.locator(".food-meal-energy")).toContainText(
    "Subtotal parcial",
  );
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    20,
  );
  const first = await page
    .locator(".food-record-details > summary")
    .first()
    .textContent();
  await page.getByRole("link", { name: "Próximos", exact: true }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(
    page.locator(".food-record-details > summary").first(),
  ).not.toHaveText(first!);
  await expect(lunch.locator(".food-meal-identity")).toContainText(
    "1005 alimentos",
  );
  const context = page.locator(".dz-module-context");
  await context.locator("summary").click();
  await context.getByLabel("Projeto para consultar").selectOption(history);
  await context
    .getByRole("button", { name: "Consultar projeto", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`projeto=${history}`));
  await expect(page.locator(".readonly-note")).toContainText(
    "Histórico somente leitura",
  );
  await expect(page.locator(".manual-meal-recorder")).toHaveCount(0);
  await expect(page.locator(".food-meal-actions")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".meal-record-group")).toHaveCount(6);
  await page.screenshot({
    path: `${folder}/empty-history-390.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const after = await (await page.request.get("/api/exportar")).json();
  for (const key of ["meal_items", "projects", "diet_plans"])
    expect(after[key]).toEqual(before[key]);
  expect(after.meal_items).toHaveLength(1017);
  expect(exceptions).toEqual([]);
});
