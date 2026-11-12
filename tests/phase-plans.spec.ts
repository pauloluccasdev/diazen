import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
test.use({ serviceWorkers: "block" });
test("planos revisados, imagem privada, meta vigente e vínculo de execução não duplicam registros", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const close = async () => {
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
  };
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("phase-plans@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Planos da fase QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  const start = page.getByLabel("Início", { exact: true }),
    date = await start.inputValue();
  const shift = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  await start.fill(shift(-1));
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/fases");
  await page.getByText("Adicionar fase", { exact: true }).click();
  await page.getByLabel("Nome da fase", { exact: true }).fill("Base QA");
  await page.getByLabel("Início da fase").fill(date);
  await page.getByLabel("Fim da fase").fill(shift(30));
  await page
    .getByLabel("Objetivo desta fase")
    .fill("Organizar o acompanhamento");
  await page.getByRole("button", { name: "Criar fase", exact: true }).click();
  await close();
  const first = await (await page.request.get("/api/exportar")).json();
  const phase = first.project_phases[0].id;
  await page.goto("/painel/planos");
  await page
    .getByRole("link", { name: "Cadastrar hidratação", exact: true })
    .click();
  await page.getByLabel("Nome desta versão").fill("Água QA");
  await page.getByLabel("Mínimo de referência (ml)").fill("2000");
  await page.getByLabel("Máximo de referência (ml)").fill("2500");
  await page
    .getByRole("combobox", { name: "Fase (opcional)", exact: true })
    .selectOption(phase);
  await page.getByText("Enviar imagem de referência", { exact: true }).click();
  const buffer = await sharp({
    create: { width: 48, height: 48, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Imagem do plano", { exact: true }).setInputFiles({
    name: "Referencia-QA.png",
    mimeType: "image/png",
    buffer,
  });
  await page
    .getByRole("button", { name: "Salvar referência privada", exact: true })
    .click();
  await expect(
    page.locator(".plan-reference-fields [role=status]"),
  ).toContainText("Referência salva");
  await page.getByRole("checkbox", { name: /Conferi os dados/ }).check();
  await page
    .getByRole("button", { name: "Salvar versão do plano", exact: true })
    .click();
  await close();
  await page
    .getByRole("link", { name: "Ver versão salva", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Plano de hidratação", exact: true }),
  ).toContainText("2–2,5 L/dia");
  const waterExport = await (await page.request.get("/api/exportar")).json();
  expect(waterExport.plan_assets).toHaveLength(1);
  expect(waterExport.photos).toHaveLength(0);
  const asset = waterExport.plan_assets[0].id;
  const ownImage = await page.request.get(`/api/planos/referencias/${asset}`);
  expect(ownImage.status()).toBe(200);
  expect(ownImage.headers()["cache-control"]).toContain("no-store");
  expect((await request.get(`/api/planos/referencias/${asset}`)).status()).toBe(
    401,
  );
  expect(
    (
      await page.request.post("/api/planos/referencias", {
        headers: { origin: "https://external.invalid" },
      })
    ).status(),
  ).toBe(403);
  await page
    .getByText("Usar uma referência deste plano", { exact: true })
    .click();
  await page.getByLabel("Referência escolhida (ml)").fill("2250");
  await page
    .getByRole("checkbox", {
      name: "Confirmo alterar a meta vigente a partir de hoje.",
    })
    .check();
  await page
    .getByRole("button", { name: "Confirmar referência de água", exact: true })
    .click();
  await close();
  const goals = await (await page.request.get("/api/exportar")).json();
  expect(
    goals.water_goals.find(
      (g: { effective_from: string }) => g.effective_from === date,
    ).target_ml,
  ).toBe(2250);
  expect(
    goals.water_goals.find(
      (g: { effective_from: string }) => g.effective_from === shift(-1),
    ).target_ml,
  ).toBe(2000);
  expect(goals.water_entries).toHaveLength(0);
  await page.goto("/painel/planos/novo?tipo=strength");
  await page.getByLabel("Nome desta versão").fill("Fichas QA");
  await page
    .getByRole("combobox", { name: "Fase (opcional)", exact: true })
    .selectOption(phase);
  await page.getByLabel("Nome da ficha", { exact: true }).fill("Ficha A QA");
  await page
    .getByLabel("Exercício", { exact: true })
    .fill("Exercício de teste");
  await page.getByLabel("Séries planejadas").fill("3");
  await page.getByLabel("Repetições mínimas").fill("8");
  await page.getByLabel("Repetições máximas").fill("12");
  await page.getByLabel("Descanso (segundos, opcional)").fill("60");
  await page.getByRole("checkbox", { name: /Conferi os dados/ }).check();
  await page
    .getByRole("button", { name: "Salvar versão do plano", exact: true })
    .click();
  await close();
  await page
    .getByRole("link", { name: "Ver versão salva", exact: true })
    .click();
  await expect(page.locator(".workout-exercise-list")).toContainText(
    "3 séries · 8–12 repetições",
  );
  const savedUrl = page.url();
  expect(
    (await (await page.request.get("/api/exportar")).json()).activities,
  ).toHaveLength(0);
  await page.goto("/painel/atividades");
  await page.locator(".record-create > summary").click();
  const activityForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar registro", exact: true }),
  });
  await activityForm
    .getByLabel("Título (opcional)", { exact: true })
    .fill("Sessão já registrada");
  await activityForm.getByLabel("Duração (minutos)").fill("30");
  await activityForm
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(activityForm.getByRole("status")).toContainText(
    "Registro adicionado.",
  );
  const activityExport = await (await page.request.get("/api/exportar")).json();
  const id = activityExport.activities[0].id;
  await page.goto(savedUrl);
  await page
    .getByText("Registrar execução desta ficha", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Como registrar a sessão?", exact: true })
    .selectOption(id);
  await page.getByLabel("Esforço percebido", { exact: false }).fill("0");
  await page
    .getByRole("button", { name: "Confirmar execução", exact: true })
    .click();
  await close();
  await expect(page.locator(".workout-sheet")).toContainText("RPE 0");
  const linked = await (await page.request.get("/api/exportar")).json();
  expect(linked.activities).toHaveLength(1);
  expect(linked.activities[0].name).toBe("Sessão já registrada");
  expect(linked.workout_links).toHaveLength(1);
  expect(linked.workout_links[0].activity_id).toBe(id);
  expect(linked.workout_links[0].rpe).toBe("0.0");
  expect(linked.plan_asset_cleanup).toBeUndefined();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator(".saved-phase-plan")
    .screenshot({ path: "artifacts/strength-plan-320.png" });
  await page
    .getByText("Desvincular ficha desta atividade", { exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /Confirmo remover apenas o vínculo/ })
    .check();
  await page
    .getByRole("button", { name: "Remover vínculo", exact: true })
    .click();
  await close();
  const unlinked = await (await page.request.get("/api/exportar")).json();
  expect(unlinked.workout_links).toHaveLength(0);
  expect(unlinked.activities).toHaveLength(1);
  expect(unlinked.activities[0].id).toBe(id);
  await page.goto("/painel/plano");
  await page
    .getByRole("button", {
      name: "Criar plano alimentar manualmente",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nome do plano", { exact: true })
    .fill("Alimentação manual QA");
  await page
    .getByRole("combobox", { name: "Fase (opcional)", exact: true })
    .selectOption(phase);
  await page
    .getByRole("combobox", {
      name: "Imagem de referência (opcional)",
      exact: true,
    })
    .selectOption(asset);
  await page.getByRole("checkbox", { name: /Revisei os alimentos/ }).check();
  await page
    .getByRole("button", { name: "Salvar versão do plano", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Plano salvo");
  const manual = await (await page.request.get("/api/exportar")).json();
  expect(manual.diet_plans).toHaveLength(1);
  expect(manual.diet_plans[0].phase_id).toBe(phase);
  expect(manual.diet_plans[0].reference_image_id).toBe(asset);
  expect(manual.diet_plans[0].valid_until).toBe(shift(30));
  expect(manual.meal_items).toHaveLength(0);
  await page.goto("/painel/fotos");
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    0,
  );
});
