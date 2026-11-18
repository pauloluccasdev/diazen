import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("evolução v2: períodos reais, metas opcionais, edição e medidas sem composição inventada", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) => {
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const session = await (
    await page.request.post(
      "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
      {
        data: { email: "body-v2@example.test", password: "senha-de-teste-123" },
      },
    )
  ).json();
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
    p_starts_on: shift(-90),
    p_ends_on: shift(180),
    p_weight_mode: "target",
    p_weight_min: 88,
    p_water_ml: 3000,
  });
  await post(
    "weights",
    [
      [-45, 97],
      [-28, 96],
      [-14, 95],
      [-7, 94.6],
      [-1, 94],
    ].map(([day, kg]) => ({ project_id: project, logged_on: shift(day), kg })),
  );
  await post("measurements", [
    {
      project_id: project,
      logged_on: shift(-14),
      measurement_type: "waist",
      value_cm: 94,
    },
    {
      project_id: project,
      logged_on: shift(-1),
      measurement_type: "waist",
      value_cm: 92,
    },
    {
      project_id: project,
      logged_on: shift(-1),
      measurement_type: "chest",
      value_cm: 110,
    },
  ]);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("body-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const url = `/painel/peso?projeto=${project}&data=${today}`;
  await page.goto(url);
  await expect(
    page.getByRole("heading", {
      name: "Evolução corporal",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Peso atual na consulta" }),
  ).toContainText("94 kg");
  await expect(page.locator(".body-difference").first()).toContainText(
    "-0,6 kg",
  );
  await expect(page.locator(".body-reference")).toContainText("88 kg");
  await expect(page.locator(".body-gap")).toContainText("+6 kg");
  await expect(page.locator(".body-history article")).toHaveCount(4);
  await expect(
    page
      .locator(".body-weight-chart")
      .getByRole("img", { name: /^Evolução do peso:/ }),
  ).toHaveAttribute("aria-label", /4 medições/);
  const positions = await page
    .locator(".body-weight-chart")
    .getByRole("img", { name: /^Evolução do peso:/ })
    .locator("circle")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("cx"))),
    );
  expect(positions).toHaveLength(4);
  expect(positions[1] - positions[0]).toBeCloseTo(
    2 * (positions[2] - positions[1]),
    3,
  );
  const before = await (await page.request.get("/api/exportar")).json();
  const folder = `artifacts/diazen-v2/body-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width: 1672, height: 941 });
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Ativar modo escuro no desktop" })
        .click();
    await page.screenshot({
      path: `${folder}/${theme}-1672.png`,
      animations: "disabled",
    });
  }
  for (const width of [320, 390, 768, 1366, 1672]) {
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
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const calendarTrigger = page.getByRole("button", {
    name: "Escolher data do diário",
    exact: true,
  });
  await calendarTrigger.click();
  await expect(page.getByLabel("Escolher data", { exact: true })).toBeVisible();
  await page.getByLabel("Escolher data", { exact: true }).press("Escape");
  await expect(calendarTrigger).toBeFocused();
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.locator(".body-toolbar .body-period>summary").click();
  await page
    .getByRole("navigation", { name: "Período da evolução" })
    .getByRole("link", { name: "Últimos 7 dias", exact: true })
    .click();
  await expect(page.locator(".body-history article")).toHaveCount(1);
  await page.locator(".body-toolbar .body-period>summary").click();
  await page
    .getByRole("navigation", { name: "Período da evolução" })
    .getByRole("link", { name: "Todo o projeto", exact: true })
    .click();
  await expect(page.locator(".body-history article")).toHaveCount(5);
  expect(
    (await (await page.request.get("/api/exportar")).json()).weights,
  ).toEqual(before.weights);
  // Edit the selected date, preserve its identity and keep the date fixed.
  const latest = page.locator(".body-history article").first();
  await latest.getByRole("link", { name: /^Editar / }).click();
  const editing = latest.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar alteração", exact: true }),
  });
  await expect(editing.getByLabel("Data", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await editing.getByLabel("Peso (kg)").fill("93.8");
  await editing
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(editing.getByRole("status")).toContainText("Peso salvo");
  const edited = await (await page.request.get("/api/exportar")).json();
  expect(edited.weights).toHaveLength(5);
  expect(
    Number(
      edited.weights.find(
        (r: { logged_on: string }) => r.logged_on === shift(-1),
      ).kg,
    ),
  ).toBe(93.8);
  // A new registration closes feedback and resets only after success.
  await page
    .locator(".body-mobile-register,.body-quick-actions")
    .getByRole("link", { name: "Registrar peso", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  const create = page.locator(".body-create form");
  await create.getByLabel("Data", { exact: true }).fill(today);
  await create.getByLabel("Peso (kg)").fill("94");
  await create
    .getByRole("button", { name: "Salvar peso", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Peso salvo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(create.getByLabel("Peso (kg)")).toHaveValue("");
  expect(
    (await (await page.request.get("/api/exportar")).json()).weights,
  ).toHaveLength(6);
  const newRow = page
    .locator(".body-history article")
    .filter({ has: page.locator(`time[datetime="${today}"]`) });
  await newRow.getByRole("link", { name: /^Excluir / }).click();
  const removal = newRow.locator("form").filter({
    has: page.getByRole("button", {
      name: "Confirmar exclusão",
      exact: true,
    }),
  });
  await removal.getByRole("checkbox").check();
  await removal
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.locator(".body-history article")).toHaveCount(5);
  expect(
    (await (await page.request.get("/api/exportar")).json()).weights,
  ).toHaveLength(5);
  await page
    .getByRole("navigation", { name: "Evolução corporal" })
    .getByRole("link", { name: "Medidas", exact: true })
    .click();
  await expect(page.locator(".body-measurement-card")).toHaveCount(2);
  await expect(
    page.locator(".body-measurement-card").filter({ hasText: "Cintura" }),
  ).toContainText("-2 cm");
  await expect(
    page.locator(".body-measurement-card").filter({ hasText: "Quadril" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `${folder}/measurements-1672.png`,
    animations: "disabled",
  });
  const waistRow = page.locator(".body-history article").filter({
    has: page.getByRole("heading", { name: "Cintura · 92 cm", exact: true }),
  });
  await waistRow.getByRole("link", { name: /^Editar / }).click();
  await waistRow.getByLabel("Cintura (cm)", { exact: true }).fill("91");
  await waistRow
    .getByRole("button", { name: "Salvar alteração", exact: true })
    .click();
  await expect(
    page.locator(".body-measurement-card").filter({ hasText: "Cintura" }),
  ).toContainText("91 cm");
  const afterMeasure = await (await page.request.get("/api/exportar")).json();
  expect(afterMeasure.measurements).toHaveLength(3);
  await expect(page.locator(".body-composition")).toHaveCount(0);
  const rangePatch = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    { headers, data: { weight_mode: "range", weight_min: 88, weight_max: 96 } },
  );
  expect(rangePatch.ok()).toBe(true);
  await page.goto(url);
  await expect(page.locator(".body-reference")).toContainText("88–96 kg");
  await expect(page.locator(".body-gap")).toContainText("0 kg");
  await expect(page.locator(".body-gap")).toContainText(
    "Dentro da referência configurada",
  );
  const patch = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    {
      headers,
      data: { weight_mode: "track", weight_min: null, weight_max: null },
    },
  );
  expect(patch.ok()).toBe(true);
  await page.goto(url);
  await expect(page.locator(".body-reference")).toHaveCount(0);
  await expect(page.locator(".body-gap")).toHaveCount(0);
  await expect(page.locator(".body-composition")).toContainText(
    "Sem avaliação registrada",
  );
  const longName = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    { headers, data: { name: "Projeto".repeat(14) } },
  );
  expect(longName.ok()).toBe(true);
  await page.goto(url);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator(".dz-module-project")).toContainText(
    "Projeto".repeat(14),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${folder}/long-name-320.png`,
    animations: "disabled",
  });
  const close = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    { headers, data: { status: "COMPLETED" } },
  );
  expect(close.ok()).toBe(true);
  await page.goto(url);
  await expect(page.locator(".readonly-note")).toContainText(
    "Histórico somente leitura",
  );
  await expect(page.locator(".body-create")).toHaveCount(0);
  await expect(page.locator(".body-history form")).toHaveCount(0);
  const draft = await post("rpc/create_project", {
    p_name: "Evolução futura",
    p_starts_on: shift(7),
    p_ends_on: shift(40),
    p_activate: false,
  });
  await page.goto(`/painel/peso?projeto=${draft}`);
  await expect(page.locator(".body-current")).toContainText("Não registrado");
  await expect(page.locator(".body-reference")).toHaveCount(0);
  await expect(page.locator(".body-history article")).toHaveCount(0);
  await expect(page.locator(".body-create")).toHaveCount(0);
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
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("evolução v2: leituras completas e paginação não truncam mil datas de peso e medidas", async ({
  page,
}) => {
  test.setTimeout(120000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) =>
    new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const token = await (
    await page.request.post(
      "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
      {
        data: {
          email: "body-volume@example.test",
          password: "senha-de-teste-123",
        },
      },
    )
  ).json();
  const headers = {
    authorization: `Bearer ${token.access_token}`,
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
    p_name: "Histórico longo de evolução",
    p_sessions: 3,
    p_starts_on: shift(-1300),
    p_ends_on: shift(30),
  });
  await post(
    "weights",
    Array.from({ length: 1005 }, (_, i) => ({
      project_id: project,
      logged_on: shift(-i),
      kg: 100 - i / 100,
    })),
  );
  await post(
    "measurements",
    Array.from({ length: 1005 }, (_, i) => ({
      project_id: project,
      logged_on: shift(-i),
      measurement_type: "waist",
      value_cm: 100 - i / 100,
    })),
  );
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("body-volume@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const url = `/painel/peso?projeto=${project}&data=${date}&periodo=project`;
  await page.goto(url);
  await expect(page.locator(".body-history article")).toHaveCount(20);
  await expect(
    page
      .locator(".body-weight-chart")
      .getByRole("img", { name: /^Evolução do peso:/ }),
  ).toHaveAttribute("aria-label", /1005 medições/);
  await expect(page.locator(".body-reference")).toHaveCount(0);
  await page
    .locator(".body-pagination")
    .getByRole("link", { name: "Próximos", exact: true })
    .click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.locator(".body-history article")).toHaveCount(20);
  await page.goto(url + "&pagina=51");
  await expect(page.locator(".body-history article")).toHaveCount(5);
  await expect(page.locator(".body-history article").last()).toContainText(
    shift(-1004).split("-").reverse().join("/"),
  );
  await page.goto(
    `/painel/medidas?projeto=${project}&data=${date}&periodo=project&pagina=51`,
  );
  await expect(page.locator(".body-history article")).toHaveCount(5);
  await expect(page.locator(".body-measurement-card")).toHaveCount(1);
  await expect(page.locator(".body-measurement-card")).toContainText("100 cm");
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.weights).toHaveLength(1005);
  expect(exported.measurements).toHaveLength(1005);
});
