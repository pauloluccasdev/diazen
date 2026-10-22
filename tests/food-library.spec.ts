import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const form = (page: Page, button: string) =>
  page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button, exact: true }) });
test("alimentos próprios, receitas, favoritos, recentes e cópia preservam o diário", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("alimentos@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Biblioteca E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/alimentos");
  await page.getByText("Cadastrar alimento próprio", { exact: true }).click();
  const create = form(page, "Salvar alimento");
  await create.getByLabel("Nome do alimento").fill("Aveia própria");
  await create.getByLabel("Calorias (kcal)").fill("100");
  await create.getByLabel("Proteínas (g)").fill("10");
  await create
    .getByRole("button", { name: "Salvar alimento", exact: true })
    .click();
  await expect(create.getByRole("status")).toContainText("Alimento salvo");
  await page.reload();
  await page.getByText("Cadastrar alimento próprio", { exact: true }).click();
  await create
    .getByLabel("Nome do alimento")
    .fill("Ingrediente sem calorias informadas");
  await create.getByLabel("Proteínas (g)").fill("0");
  await create
    .getByRole("button", { name: "Salvar alimento", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  const oats = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Aveia própria", exact: true }),
  });
  await oats.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    oats.getByRole("button", { name: "Remover favorito" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Mostrar", exact: true })
    .selectOption("favorite");
  await page.getByRole("button", { name: "Filtrar biblioteca" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Mostrar", exact: true })
    .selectOption("");
  await page.getByRole("button", { name: "Filtrar biblioteca" }).click();
  await page.getByText("Criar receita", { exact: true }).click();
  const recipe = form(page, "Salvar receita");
  await recipe.getByLabel("Nome da receita").fill("Minha receita");
  await recipe.getByLabel("Rendimento (porções)").fill("2");
  await recipe
    .getByRole("button", { name: "Buscar alimentos", exact: true })
    .click();
  await recipe
    .getByRole("button", { name: "Incluir Aveia própria", exact: true })
    .click();
  await recipe
    .getByRole("button", {
      name: "Incluir Ingrediente sem calorias informadas",
      exact: true,
    })
    .click();
  await recipe
    .getByRole("button", { name: "Salvar receita", exact: true })
    .click();
  await expect(
    recipe.getByRole("status").filter({ hasText: "Receita salva" }),
  ).toContainText("Receita salva");
  const savedRecipe = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Minha receita", exact: true }),
  });
  await expect(savedRecipe).toContainText("Calorias: não informado");
  await expect(savedRecipe).toContainText("Proteínas: 10 g");
  await savedRecipe.getByText("Usar no diário", { exact: true }).click();
  await savedRecipe
    .getByRole("button", { name: "Adicionar ao diário" })
    .click();
  await expect(savedRecipe.getByRole("status").last()).toContainText(
    "Alimento adicionado",
  );
  await page.goto("/painel/alimentacao");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.locator(".nutrition-grid")).toContainText("5 g");
  await expect(
    page.locator(".nutrition-grid").getByText("Não informado", { exact: true }),
  ).toHaveCount(3);
  await page.getByText("Alimentos recentes", { exact: true }).click();
  await page
    .locator("summary")
    .filter({ hasText: /Minha receita · 1 porção/ })
    .click();
  await page.getByRole("button", { name: "Reutilizar alimento" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Marcar dia como concluído" }).click();
  await expect(
    page.getByText("Dia concluído manualmente.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Copiar refeição", { exact: true }).click();
  const copy = form(page, "Confirmar cópia da refeição");
  await copy
    .getByRole("combobox", { name: "Refeição de destino", exact: true })
    .selectOption("lunch");
  await copy
    .getByRole("button", { name: "Confirmar cópia da refeição" })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await copy.getByRole("checkbox").check();
  await copy
    .getByRole("button", { name: "Confirmar cópia da refeição" })
    .click();
  await expect(copy.getByRole("status")).toContainText("2 itens");
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(
    page.getByText("Dia ainda não confirmado.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.goto("/painel/alimentos");
  await oats.getByText("Editar alimento", { exact: true }).click();
  await oats.getByLabel("Proteínas (g)").fill("99");
  await oats.getByRole("button", { name: "Atualizar alimento" }).click();
  await expect(oats.getByRole("status")).toContainText("Alimento salvo");
  await expect(savedRecipe).toContainText("Proteínas: 10 g");
  await page.getByText("Criar receita", { exact: true }).click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Biblioteca preenchida em ${width}px`,
    ).toBe(true);
  }

  const exported = await page.request.get("/api/exportar");
  const json = await exported.json();
  expect(json.food_library).toHaveLength(3);
  expect(json.food_copy_requests).toHaveLength(1);
  await page.goto("/painel/alimentacao");
  await expect(page.locator(".nutrition-grid")).toContainText("20 g");
});
