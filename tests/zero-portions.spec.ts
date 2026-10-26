import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { dietPdf } from "./fixtures/diet-pdf.mjs";
test.use({ serviceWorkers: "block" });
test("porção zero exclui apenas o alimento não consumido e permite salvar os demais", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("zero-portions@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Porções QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/plano");
  await expect(page.getByLabel("Selecionar PDF")).toBeEnabled();
  await page.getByLabel("Selecionar PDF").setInputFiles({
    name: "sintetico.pdf",
    mimeType: "application/pdf",
    buffer: dietPdf([
      [
        [[50, "Refeição 1"]],
        [
          [50, "Arroz branco"],
          [330, "125g"],
        ],
        [
          [50, "Peito de frango"],
          [330, "150g"],
        ],
        [[50, "Observações:"]],
      ],
    ]),
  });
  await page.getByLabel("Revisei a extração", { exact: false }).check();
  await page.getByRole("button", { name: "Salvar versão do plano" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Entendi" })
    .click();
  await page.goto("/painel/alimentacao");
  const meal = page.locator(".planned-meal").first();
  await meal.locator(":scope > summary").click();
  await meal
    .getByRole("combobox", { name: "Refeição no diário" })
    .selectOption("breakfast");
  await meal
    .getByRole("button", { name: "Ajustar porções", exact: true })
    .click();
  const rice = meal.getByLabel("Porção de Arroz branco (g)", { exact: true });
  const chicken = meal.getByLabel("Porção de Peito de frango (g)", {
    exact: true,
  });
  const save = meal.getByRole("button", {
    name: "Confirmar porções e registrar",
  });
  await rice.fill("0");
  await chicken.fill("0");
  await expect(save).toBeDisabled();
  await expect(meal.locator(".meal-total")).toContainText("0 kcal");
  await rice.fill("100");
  await expect(save).toBeEnabled();
  await expect(meal.locator(".meal-total")).toContainText("128 kcal");
  await expect(meal.getByText("Não consumido", { exact: true })).toBeVisible();
  await chicken.fill("75");
  await expect(meal.locator(".meal-total")).toContainText("247,3 kcal");
  await chicken.fill("0");
  await page.setViewportSize({ width: 320, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await meal.screenshot({ path: "artifacts/zero-portions-320.png" });
  await save.click();
  await expect(meal).toContainText("Refeição registrada");
  await page.reload();
  await meal.locator(":scope > summary").click();
  await expect(meal).toContainText("Planejado: 398,5 kcal");
  await expect(meal).toContainText("Registrado: 128 kcal");
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    1,
  );
  const record = page.getByRole("article", { includeHidden: true }).first();
  await expect(record).toContainText("Arroz branco");
  await expect(record).not.toContainText("Peito de frango");
  await page.goto("/painel");
  await expect(page.locator(".daily-metric")).toContainText("128");
});
