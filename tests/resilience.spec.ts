import { expect, test } from "@playwright/test";

test("tentar novamente refaz a leitura do servidor após indisponibilidade", async ({
  page,
  request,
}) => {
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("resiliencia@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const hook =
    "http://127.0.0.1:54329/_test/read-failure/00000000-0000-4000-8000-000000000007/";
  try {
    await request.get(hook + "on");
    await page.goto("/painel/projetos");
    await expect(
      page.getByRole("heading", { name: "Não foi possível carregar." }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "Synthetic read failure",
    );
    await request.get(hook + "off");
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Meus projetos." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Criar projeto", exact: true }),
    ).toBeEnabled();
  } finally {
    await request.get(hook + "off");
  }
});
