import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test("TACO exige escolha e confirmação, preserva a fonte e calcula o consumo", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("taco@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("TACO E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/alimentos");
  await page.getByText("Cadastrar alimento próprio", { exact: true }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar alimento", exact: true }),
  });
  await form.getByText("Consultar tabela TACO", { exact: true }).click();
  await form.getByLabel("Buscar alimento na TACO").fill("requeijao light");
  await expect(form.getByText(/Nenhum alimento encontrado/)).toBeVisible();
  await expect(form.getByLabel("Nome do alimento")).toHaveValue("");
  await form.getByLabel("Buscar alimento na TACO").fill("arroz tipo 1 cozido");
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_REVIEW === "1") {
    await mkdir("artifacts/taco-review", { recursive: true });
    await form
      .locator(".taco-lookup")
      .screenshot({ path: "artifacts/taco-review/search-320.png" });
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await form.getByRole("button", { name: /Arroz, tipo 1, cozido/ }).click();
  await expect(form.getByLabel("Nome do alimento")).toHaveValue(
    "Arroz, tipo 1, cozido",
  );
  await expect(form.getByLabel("Quantidade de referência")).toHaveValue("100");
  await expect(
    form.getByRole("combobox", { name: "Unidade", exact: true }),
  ).toHaveValue("g");
  await expect(form.getByLabel("Calorias (kcal)")).toHaveValue("128");
  await expect(form.getByLabel("Proteínas (g)")).toHaveValue("2.5");
  await expect(form.getByLabel("Carboidratos (g)")).toHaveValue("28.1");
  await expect(form.getByLabel("Gorduras (g)")).toHaveValue("0.2");
  await expect(form.getByLabel("Fonte dos valores")).toHaveValue(
    /item 3, p\. 26/,
  );
  await expect(form.getByLabel("Nome do alimento")).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
  await form
    .getByRole("button", { name: "Salvar alimento", exact: true })
    .click();
  const rice = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "Arroz, tipo 1, cozido",
      exact: true,
    }),
  });
  await expect(rice).toBeVisible();
  await rice.getByText("Usar no diário", { exact: true }).click();
  await rice.getByLabel("Quantidade a consumir").fill("125");
  await rice
    .getByRole("button", { name: "Adicionar ao diário", exact: true })
    .click();
  await expect(rice.getByRole("status")).toContainText("adicionado");
  const response = await page.request.get("/api/exportar");
  const data = await response.json();
  expect(data.food_library[0].source).toContain("item 3, p. 26");
  expect(data.meal_items).toHaveLength(1);
  expect(Number(data.meal_items[0].amount)).toBe(125);
  expect(Number(data.meal_items[0].reference_amount)).toBe(100);
  await page.goto("/painel/alimentacao");
  await expect(page.getByText("160 kcal", { exact: true })).toBeVisible();
});
