import { expect, test } from "@playwright/test";

test("mostrar senhas preserva valores, não envia formulários e funciona por teclado", async ({
  page,
}) => {
  let loginSubmissions = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/entrar"
    )
      loginSubmissions++;
  });
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("resiliencia@example.test");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("senha-de-teste-123");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("senha-de-teste-123");
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .press("Space");
  await expect(password).toHaveAttribute("type", "password");
  expect(loginSubmissions).toBe(0);

  await page.goto("/cadastro");
  const signupPassword = page.getByLabel("Senha", { exact: true });
  const confirmation = page.getByLabel("Confirme a senha", { exact: true });
  await signupPassword.fill("senha-ficticia-123");
  await confirmation.fill("senha-ficticia-456");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(signupPassword).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Mostrar confirmação da senha", exact: true })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveValue("senha-ficticia-456");
  await page.reload();
  await expect(signupPassword).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");

  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("resiliencia@example.test");
  await password.fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/nova-senha");
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("outra-senha-ficticia-123");
  await page
    .getByRole("button", { name: "Mostrar nova senha", exact: true })
    .click();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.goto("/painel/perfil");
  await page.getByText("Solicitar exclusão da conta", { exact: true }).click();
  await page
    .getByLabel("Senha atual", { exact: true })
    .fill("senha-de-teste-123");
  await page
    .getByRole("button", { name: "Mostrar senha atual", exact: true })
    .click();
  await expect(page.getByLabel("Senha atual", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(
    page.getByRole("button", { name: "Excluir minha conta", exact: true }),
  ).toBeEnabled();
});
