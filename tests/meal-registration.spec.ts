import { test, expect } from "@playwright/test";
import { dietPdf } from "./fixtures/diet-pdf.mjs";
import AxeBuilder from "@axe-core/playwright";
test.use({ serviceWorkers: "block" });
test("plano salvo oferece registro explícito, porções reais, refeição manual e cálculo sem duplicar o plano", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("meal-plan@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Refeições QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/plano");
  await expect(page.getByLabel("Selecionar PDF")).toBeEnabled();
  await page.getByLabel("Selecionar PDF").setInputFiles({
    name: "ficticio.pdf",
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
      [
        [[50, "Refeição 2"]],
        [
          [50, "Pão francês"],
          [330, "50g"],
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
  await expect(page.locator(".plan-entry")).toContainText("Plano salvo");
  await expect(page.locator(".plan-entry")).not.toContainText(
    "Importe seu PDF",
  );
  await expect(page.locator(".planned-meal")).toHaveCount(2);
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    0,
  );
  const first = page.locator(".planned-meal").first();
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator(":scope > summary").click();
  await first
    .getByRole("combobox", { name: "Refeição no diário" })
    .selectOption("breakfast");
  await first
    .getByRole("button", { name: "Ajustar porções", exact: true })
    .click();
  await first
    .getByLabel("Porção de Arroz branco (g)", { exact: true })
    .fill("100");
  await first
    .getByLabel("Porção de Peito de frango (g)", { exact: true })
    .fill("75");
  await expect(first).toContainText("247,3 kcal");
  await first
    .getByRole("button", { name: "Confirmar porções e registrar" })
    .click();
  await expect(first).toContainText("Refeição registrada");
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    2,
  );
  await page.reload();
  await expect(first).toContainText("já registrada");
  await expect(first).toContainText("Planejado: 398,5 kcal");
  await expect(first).toContainText("Registrado: 247,3 kcal");
  await expect(
    first.getByRole("button", { name: "Registrar conforme o plano" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Parcial: o diário", { exact: false }),
  ).toBeVisible();
  const second = page.locator(".planned-meal").nth(1);
  await second.locator(":scope > summary").click();
  await second
    .getByRole("combobox", { name: "Refeição no diário" })
    .selectOption("lunch");
  await second
    .getByRole("button", { name: "Registrar conforme o plano" })
    .click();
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    3,
  );
  await expect(
    page.getByText("Completo: todas as refeições do plano foram registradas."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marcar dia como concluído" }),
  ).toHaveCount(0);
  const manual = page.locator(".manual-meal-recorder");
  await manual.locator(":scope > summary").click();
  let food = manual.locator(".meal-food-editor").first();
  await food.getByLabel("Alimento", { exact: true }).fill("Arroz branco");
  await food.getByLabel("Quantidade consumida", { exact: true }).fill("100");
  await manual
    .getByRole("button", { name: "Adicionar outro alimento" })
    .click();
  food = manual.locator(".meal-food-editor").nth(1);
  await food.getByLabel("Alimento", { exact: true }).fill("Pão francês");
  await food.getByLabel("Quantidade consumida", { exact: true }).fill("50");
  await expect(manual.locator(".meal-total")).toContainText("278 kcal");
  await manual
    .getByRole("combobox", { name: "Refeição", exact: true })
    .selectOption("dinner");
  await manual
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    5,
  );
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(
    exported.meal_items.filter((r: { plan_id: string | null }) => r.plan_id),
  ).toHaveLength(3);
  expect(
    exported.diet_plans[0].document.meals[0].groups[0].choices[0].amount,
  ).toBe(125);
  await expect(page.locator(".meal-record-group")).toHaveCount(3);
  await expect(
    page.locator(".meal-record-group > summary").first(),
  ).toContainText("Café da manhã");
  await expect(
    page.locator(".meal-record-group > summary").first(),
  ).toContainText("2 alimentos");
  await expect(
    page.locator(".meal-record-group > summary").first(),
  ).toContainText("247,3 kcal");
  await page.locator(".meal-record-group > summary").first().click();
  const record = page.getByRole("article", { includeHidden: true }).first();
  await expect(record.locator(".food-record-details")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(
    record.getByText("Editar registro", { exact: true }),
  ).toBeHidden();
  await record.locator(".food-record-details > summary").click();
  await expect(
    record.getByText("Editar registro", { exact: true }),
  ).toBeVisible();
  await record.locator(".food-record-details > summary").click();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "artifacts/meal-registration/food-page-320.png",
    fullPage: true,
  });
  await context.setOffline(true);
  await expect(
    manual.getByRole("button", { name: "Adicionar outro alimento" }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.goto("/painel");
  const comparison = page.locator(".dashboard-diet-comparison");
  await expect(comparison).toContainText("675,3 kcal");
  await expect(
    comparison
      .locator("div")
      .filter({
        has: page.locator("dt", { hasText: "Refeições do plano registradas" }),
      })
      .locator("dd"),
  ).toHaveText("2");
  await page.goto("/painel/alimentacao");
  await page.locator(".meal-record-group > summary").first().click();
  const registeredFood = page
    .getByRole("article", { includeHidden: true })
    .first();
  await registeredFood.locator(".food-record-details > summary").click();
  await registeredFood.getByText("Excluir registro", { exact: true }).click();
  await registeredFood
    .getByLabel("Confirmo a exclusão deste registro.")
    .check();
  await registeredFood
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(
    page.getByText("Parcial: o diário", { exact: false }),
  ).toBeVisible();
  const dinner = page
    .locator(".meal-record-group")
    .filter({ has: page.locator("summary strong", { hasText: "Jantar" }) });
  await dinner.locator(":scope > summary").click();
  await dinner
    .getByRole("button", { name: "Excluir refeição inteira", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Excluir refeição inteira?",
    exact: true,
  });
  await expect(dialog).toContainText("Jantar");
  await expect(
    dialog.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    4,
  );
  await dinner
    .getByRole("button", { name: "Excluir refeição inteira", exact: true })
    .click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Excluir todos os alimentos", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Refeição excluída");
  await expect(page.getByRole("article", { includeHidden: true })).toHaveCount(
    2,
  );
  await expect(page.locator(".meal-record-group")).toHaveCount(2);
  const afterDelete = await (await page.request.get("/api/exportar")).json();
  expect(
    afterDelete.meal_items.some(
      (r: { category: string }) => r.category === "dinner",
    ),
  ).toBe(false);
  expect(afterDelete.diet_plans).toHaveLength(1);
});
