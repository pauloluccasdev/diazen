import { openManualMealRecorder } from "./helpers/food-diary";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("Diazen v2: shell responsivo, dados persistidos, consulta e navegação por teclado", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const exceptions: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  const navigate = async (name: string, inMore = false) => {
    const navigation = page.getByRole("navigation", {
      name: "Navegação do painel",
    });
    if (inMore) await navigation.locator(".v2-more > summary").click();
    const link = navigation.getByRole("link", { name, exact: true });
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL(new URL(href!, "http://127.0.0.1:3100").href);
    if (name === "Início")
      await expect(page.locator(".v2-dashboard")).toBeVisible();
    else {
      const headings: Record<string, string> = {
        Projetos: "Meus projetos.",
        Hidratação: "Hidratação",
        Evolução: "Peso.",
        Treinos: "Atividades.",
        Diário: "Alimentação",
      };
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: headings[name],
          exact: true,
        }),
      ).toBeVisible();
    }
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("redesign@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(
    page.getByRole("heading", { name: "Vamos preparar seu primeiro projeto?" }),
  ).toBeVisible();
  await mkdir("artifacts/diazen-v2", { recursive: true });
  await page.screenshot({
    path: `artifacts/diazen-v2/${info.project.name}-empty-390.png`,
    fullPage: true,
  });
  await navigate("Projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Projeto Consistência");
  await page.getByLabel("Meta diária de água (ml)").fill("2500");
  await page.getByLabel("Sessões por semana", { exact: true }).fill("4");
  const start = page.getByLabel("Início", { exact: true }),
    date = await start.inputValue();
  const shifted = (n: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  await start.fill(shifted(-7));
  await page.getByLabel("Fim previsto (opcional)").fill(shifted(90));
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await navigate("Hidratação", true);
  await page.locator(".record-create > summary").click();
  const water = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar registro", exact: true }),
  });
  await water.getByRole("button", { name: "500 ml", exact: true }).click();
  await water
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(water.getByRole("status")).toContainText("Registro adicionado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  for (const [day, kg] of [
    [shifted(-7), "95"],
    [date, "94"],
  ] as const) {
    await navigate("Início");
    await navigate("Evolução");
    await page.locator(".record-create > summary").click();
    const weight = page.locator("form").filter({
      has: page.getByRole("button", { name: "Salvar peso", exact: true }),
    });
    await weight.getByLabel("Data", { exact: true }).fill(day);
    await weight.getByLabel("Peso (kg)", { exact: true }).fill(kg);
    await weight
      .getByRole("button", { name: "Salvar peso", exact: true })
      .click();
    await expect(weight.getByRole("status")).toContainText("Peso salvo");
  }
  await navigate("Treinos", true);
  await page.locator(".record-create > summary").click();
  const activity = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar registro", exact: true }),
  });
  await activity
    .getByLabel("Título (opcional)", { exact: true })
    .fill("Musculação registrada");
  await activity.getByLabel("Duração (minutos)").fill("50");
  await activity
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(activity.getByRole("status")).toContainText(
    "Registro adicionado",
  );
  await navigate("Diário");
  await openManualMealRecorder(page);
  const meal = page.locator(".manual-meal-recorder");
  await meal.getByLabel("Alimento", { exact: true }).fill("Arroz branco");
  await meal.getByLabel("Quantidade consumida", { exact: true }).fill("100");
  await expect(meal.locator(".meal-total")).toContainText("128 kcal");
  await meal
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await navigate("Início");
  await expect(page.locator(".metric-alimentacao")).toContainText("128 kcal");
  await expect(page.locator(".metric-agua")).toContainText("500 ml");
  await expect(page.locator(".metric-atividades")).toContainText("50 min");
  await expect(page.locator(".metric-peso")).toContainText("94 kg");
  const before = await (await page.request.get("/api/exportar")).json();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${width}`,
    ).toBe(true);
    await expect(page.locator(".v2-sidebar")).toBeVisible({
      visible: width >= 1024,
    });
    await expect(page.locator(".v2-bottom-nav")).toBeVisible({
      visible: width < 1024,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
      `axe ${width}`,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/diazen-v2/${info.project.name}-dashboard-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `artifacts/diazen-v2/${info.project.name}-viewport-${width}.png`,
        animations: "disabled",
      });
  }
  await page.setViewportSize({ width: 720, height: 450 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  const more = page.locator(".v2-more");
  await more.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(more).not.toHaveAttribute("open", "");
  await expect(more.locator("summary")).toBeFocused();
  await page.locator(".v2-project-selector > summary").click();
  await page.getByLabel("Data da consulta", { exact: true }).fill(shifted(-1));
  await page
    .getByRole("button", { name: "Consultar projeto", exact: true })
    .click();
  await expect(page).toHaveURL(/data=/);
  await expect(page.locator(".metric-agua")).toContainText("Sem registros");
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.water_entries).toEqual(before.water_entries);
  expect(after.activities).toEqual(before.activities);
  expect(after.weights).toEqual(before.weights);
  expect(after.meal_items).toEqual(before.meal_items);
  expect(exceptions).toEqual([]);
  expect(
    after.projects.filter((p: { status: string }) => p.status === "ACTIVE"),
  ).toHaveLength(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Hidratação", exact: true })
    .click();
  await expect(page).toHaveURL(/\/painel\/agua$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
