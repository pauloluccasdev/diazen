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
  await page.goto("/painel/projetos");
  await page.locator(".form-disclosure > summary").click();
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Rascunho ajustável");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page.getByLabel("Salvar como rascunho, sem ativar").check();
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.getByLabel("Estado dos projetos").selectOption("DRAFT");
  await page.getByRole("button", { name: "Filtrar projetos" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  const draft = page.getByRole("article");
  await expect(
    draft.getByRole("heading", { name: "Rascunho ajustável" }),
  ).toBeVisible();
  await draft.getByText("Editar datas do rascunho", { exact: true }).click();
  const initial = await draft
    .getByLabel("Início do rascunho", { exact: true })
    .inputValue();
  const earlier = new Date(initial + "T12:00:00Z");
  earlier.setUTCDate(earlier.getUTCDate() - 1);
  const earlierDate = earlier.toISOString().slice(0, 10);
  await draft
    .getByLabel("Início do rascunho", { exact: true })
    .fill(earlierDate);
  await draft
    .getByRole("button", { name: "Salvar datas", exact: true })
    .click();
  await expect(draft.getByRole("status")).toContainText(
    "Datas do rascunho atualizadas",
  );
  // Não permitir excluir a meta já existente do período do rascunho.
  await draft
    .getByLabel("Fim previsto do rascunho (opcional)")
    .fill(earlierDate);
  await draft
    .getByRole("button", { name: "Salvar datas", exact: true })
    .click();
  await expect(draft.getByRole("alert")).toContainText("período deve conter");
  await page.reload();
  await draft.getByText("Editar datas do rascunho", { exact: true }).click();
  await expect(
    draft.getByLabel("Início do rascunho", { exact: true }),
  ).toHaveValue(earlierDate);
  await expect(
    draft.getByLabel("Fim previsto do rascunho (opcional)"),
  ).toHaveValue("");
  await draft
    .getByRole("button", { name: "Ativar projeto", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByLabel("Estado dos projetos").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Filtrar projetos" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByText("Editar datas do rascunho", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Estado dos projetos").selectOption("COMPLETED");
  await page.getByRole("button", { name: "Filtrar projetos" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page
      .getByRole("article")
      .getByRole("heading", { name: "Projeto E2E", exact: true }),
  ).toBeVisible();
});
