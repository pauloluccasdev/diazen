import { expect, test } from "@playwright/test";

test("onboarding cria projeto, mantém histórico e exige confirmação de encerramento", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole("link", { name: "Projetos", exact: true }).click();
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Projeto E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2200");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Projeto E2E", exact: true }),
  });
  await expect(card.getByText("Em andamento", { exact: true })).toBeVisible();
  await card
    .getByLabel("Entendo que o projeto ficará somente leitura.")
    .first()
    .check();
  await card
    .getByRole("button", { name: "Concluir projeto", exact: true })
    .click();
  await expect(card.getByText("Concluído", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Concluir projeto", exact: true }),
  ).toHaveCount(0);
  await card.getByRole("link", { name: "Consultar projeto" }).click();
  await expect(
    page.getByText("Histórico somente leitura.", { exact: false }),
  ).toBeVisible();
});
