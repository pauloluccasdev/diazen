import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
test("desktop v2: dados equivalentes, temas persistidos, busca e períodos sem alterar registros", async ({
  page,
}) => {
  test.setTimeout(120000);
  const exceptions: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  const auth = await page.request.post(
    "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
    {
      data: {
        email: "desktop-v2@example.test",
        password: "senha-de-teste-123",
      },
    },
  );
  const session = await auth.json();
  expect(session.access_token).toBeTruthy();
  const headers = {
    authorization: `Bearer ${session.access_token}`,
    apikey: "sb_publishable_teste",
  };
  const rest = async (table: string, data: object) => {
    const response = await page.request.post(
      `http://127.0.0.1:54329/rest/v1/${table}`,
      { headers, data },
    );
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const project = await rest("rpc/create_project", {
    p_name: "Projeto 30 Trincado",
    p_starts_on: shift(-31),
    p_ends_on: shift(287),
    p_water_ml: 3500,
    p_weight_mode: "target",
    p_weight_min: 88,
    p_sessions: 6,
  });
  for (let i = 0; i < 9; i++)
    await rest("weights", {
      project_id: project,
      logged_on: shift(-28 + i * 3),
      kg: 95 - i * 0.1875,
    });
  for (let i = 0; i < 13; i++)
    await rest("meal_items", {
      project_id: project,
      logged_on: shift(-i),
      category: "lunch",
      name: "Refeição sintética para comparação",
      amount: 100,
      unit: "g",
      reference_amount: 100,
      source: "Fixture isolada — não é prescrição",
      kcal: i === 0 ? 2180 : 2000 + (i % 4) * 80,
      protein: 166,
      carbs: 262,
      fat: 53,
    });
  for (const volume of [500, 500, 600, 1000])
    await rest("water_entries", {
      project_id: project,
      logged_on: date,
      volume_ml: volume,
    });
  await rest("activities", {
    project_id: project,
    logged_on: date,
    modality: "running",
    name: "Corrida",
    duration_min: 63,
    distance_km: 12.4,
    kcal: 600,
  });
  await rest("activities", {
    project_id: project,
    logged_on: shift(-1),
    modality: "strength",
    name: "Musculação",
    duration_min: 55,
  });
  await rest("diet_plans", {
    project_id: project,
    title: "Plano de demonstração isolada",
    effective_from: shift(-31),
    document: {
      version: 1,
      title: "Plano de demonstração isolada",
      meals: [
        {
          name: "Referência diária",
          option: 1,
          conditional: false,
          enabled: true,
          groups: [
            {
              selected: 0,
              included: true,
              choices: [
                {
                  name: "Referência sintética",
                  amount: 100,
                  unit: "g",
                  original: "Fixture",
                  page: 1,
                  optional: false,
                  values: { kcal: 2500, protein: 190, carbs: 300, fat: 80 },
                  source: "Fixture isolada",
                  tacoId: null,
                },
              ],
            },
          ],
        },
      ],
    },
  });
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("desktop-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.locator(".metric-alimentacao")).toContainText("2.180 kcal");
  await expect(page.locator(".metric-agua")).toContainText("2,6 L");
  await expect(page.locator(".dz-macro-distribution")).toContainText("166 g");
  await expect(page.locator(".dz-week-panel")).toContainText(
    "Comparativo semanal",
  );
  await mkdir("artifacts/diazen-v2/desktop-fiel", { recursive: true });
  const before = await (await page.request.get("/api/exportar")).json();
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Ativar modo escuro no desktop" })
        .click();
    await expect(page.locator(".panel-shell")).toHaveAttribute(
      "data-desktop-theme",
      theme,
    );
    const markup = await (await page.request.get("/painel")).text();
    expect(markup).toContain(`data-desktop-theme="${theme}"`);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, theme).toEqual([]);
    for (const width of [1366, 1672, 1920]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 941 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme} ${width}`,
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/diazen-v2/desktop-fiel/${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (width === 1672 && theme === "light")
        await writeFile(
          "artifacts/diazen-v2/desktop-fiel/geometry.json",
          JSON.stringify(
            await page
              .locator(
                ".v2-header,.v2-dashboard-toolbar,.metric-alimentacao,.metric-alimentacao > p,.dz-weight-panel,.dz-weight-panel > .section-heading,.dz-weight-content,.dz-time-chart,.dz-weight-context,.dz-weight-context > *,.dz-macros-panel,.dz-recent-panel,.dz-project-panel",
              )
              .evaluateAll((nodes) =>
                nodes.map((node) => {
                  const box = node.getBoundingClientRect(),
                    style = getComputedStyle(node);
                  return {
                    tag: node.tagName,
                    class: node.className,
                    x: box.x,
                    y: box.y,
                    w: box.width,
                    h: box.height,
                    margin: style.margin,
                    padding: style.padding,
                    lineHeight: style.lineHeight,
                    gap: style.gap,
                    minHeight: style.minHeight,
                  };
                }),
              ),
            null,
            2,
          ),
        );
      if (width === 1672)
        await page.screenshot({
          path: `artifacts/diazen-v2/desktop-fiel/${theme}-viewport.png`,
          animations: "disabled",
        });
    }
  }
  await page
    .getByRole("button", { name: "Ativar modo claro no desktop" })
    .click();
  await page.getByRole("button", { name: /Buscar no Diazen/ }).click();
  const search = page.getByRole("dialog", { name: "Buscar páginas e ações" });
  await search.getByRole("searchbox").fill("nenhuma-pagina-xyz");
  await expect(search.getByRole("status")).toContainText("Nenhuma página");
  await page.keyboard.press("Escape");
  await expect(search).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(search).toBeVisible();
  await search.getByRole("searchbox").fill("Medidas");
  await expect(
    search.getByRole("link", { name: /Medidas corporais/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Período da evolução do peso").selectOption("7");
  await page.getByRole("button", { name: "Aplicar período do peso" }).click();
  await expect(page).toHaveURL(/periodo=7/);
  await page.getByRole("link", { name: "Dia anterior", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`data=${shift(-1)}`));
  await expect(page.locator(".metric-alimentacao")).not.toContainText(
    "2.180 kcal",
  );
  await page.goto("/painel");
  await expect(page.locator(".metric-alimentacao")).toContainText("2.180 kcal");
  await mkdir("artifacts/diazen-v2/mobile-fiel", { recursive: true });
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
    await expect(page.locator(".dashboard-day-title")).toBeVisible();
    await expect(page.locator(".project-mobile-progress")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `mobile overflow ${width}`,
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
      `mobile axe ${width}`,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/diazen-v2/mobile-fiel/${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width === 390)
      await writeFile(
        "artifacts/diazen-v2/mobile-fiel/geometry.json",
        JSON.stringify(
          await page
            .locator(
              ".v2-project-selector,.v2-project-selector > summary,.v2-project-selector small,.v2-project-selector strong,.v2-header,.metric-atividades,.metric-peso,.v2-quick-actions",
            )
            .evaluateAll((nodes) =>
              nodes.map((e) => {
                const s = getComputedStyle(e),
                  r = e.getBoundingClientRect();
                return {
                  tag: e.tagName,
                  text: e.textContent?.slice(0, 60),
                  box: { x: r.x, y: r.y, w: r.width, h: r.height },
                  display: s.display,
                  color: s.color,
                  padding: s.padding,
                  overflow: s.overflow,
                  borderRadius: s.borderRadius,
                };
              }),
            ),
          null,
          2,
        ),
      );
    if (width === 390)
      await page.screenshot({
        path: "artifacts/diazen-v2/mobile-fiel/viewport-390.png",
        animations: "disabled",
      });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Ações rápidas" })
    .getByRole("link", { name: "Água", exact: true })
    .click();
  await expect(page).toHaveURL(/registrar=1#novo-registro$/);
  await expect(page.locator("#novo-registro")).toHaveAttribute("open", "");
  await expect(
    page.locator("#novo-registro").getByLabel("Volume (ml)", { exact: true }),
  ).toBeVisible();
  await page.goto("/painel");
  await page
    .getByRole("navigation", { name: "Ações rápidas" })
    .getByRole("link", { name: "Registrar refeição", exact: true })
    .click();
  await expect(page.locator(".manual-meal-recorder")).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page
      .locator(".manual-meal-recorder")
      .getByLabel("Alimento", { exact: true }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/exportar")).json();
  for (const key of [
    "meal_items",
    "weights",
    "activities",
    "water_entries",
    "projects",
  ])
    expect(after[key]).toEqual(before[key]);
  expect(exceptions).toEqual([]);
});
