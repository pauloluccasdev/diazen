import { expect, test } from "@playwright/test";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("sem sessão, painel redireciona para login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("login válido, painel privado e logout", async ({ page }) => {
  await login(page, "teste@example.test", "senha-de-teste-123");
  await expect(page).toHaveURL(/\/painel$/);
  const response = await page.reload();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("heading", { name: "Bem-vindo à sua jornada." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("erros não revelam existência de conta", async ({ page }) => {
  await login(page, "teste@example.test", "senha-incorreta");
  const error = await page.locator("main").getByRole("alert").textContent();
  await login(page, "inexistente@example.test", "senha-incorreta");
  await expect(page.locator("main").getByRole("alert")).toHaveText(error!);
});

test("offline bloqueia envio de login", async ({ page, context }) => {
  await page.goto("/entrar");
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeDisabled();
});

test("login responsivo em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/entrar");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cookie forjado não libera acesso ao painel", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value: "sessao-forjada",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("página privada não entra no cache da PWA e logout offline é bloqueado", async ({
  page,
  context,
}) => {
  await login(page, "teste@example.test", "senha-de-teste-123");
  await expect(page).toHaveURL(/\/painel$/);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const urls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(urls).not.toContain("/painel");
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Sair da conta" }),
  ).toBeDisabled();
});

test("cadastro exige senhas iguais e informa confirmação sem enumerar conta", async ({
  page,
}) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail", { exact: true }).fill("novo@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByLabel("Confirme a senha").fill("outra-senha-longa");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "precisam ser iguais",
  );
  await page.getByLabel("E-mail", { exact: true }).fill("novo@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByLabel("Confirme a senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se o cadastro puder ser concluído",
  );
  const { link } = await (
    await page.request.get(
      "http://127.0.0.1:54329/_test/email-link?email=novo%40example.test",
    )
  ).json();
  expect(link).toBeTruthy();
  await page.goto(link);
  await expect(page).toHaveURL(/\/painel$/);
});

test("recuperação é genérica e link válido permite nova senha", async ({
  page,
}) => {
  await page.goto("/recuperar-senha");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("nao-existe@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/recuperar-senha",
    ),
    page.getByRole("button", { name: "Enviar instruções" }).click(),
  ]);
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
  const { link } = await (
    await page.request.get(
      "http://127.0.0.1:54329/_test/email-link?email=teste%40example.test",
    )
  ).json();
  expect(link).toBeTruthy();
  await page.goto(link);
  await expect(page).toHaveURL(/\/nova-senha$/);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("nova-senha-longa-123");
  await page.getByLabel("Confirme a senha").fill("nova-senha-longa-123");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByRole("status")).toContainText("Senha atualizada");
});

test("link inválido e troca sem sessão são negados", async ({ page }) => {
  await page.goto("/auth/confirmar?code=invalido&next=https://example.org");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "link expirou",
  );
  await page.goto("/nova-senha");
  await expect(page).toHaveURL(/\/recuperar-senha$/);
});

test("PKCE exige o navegador de origem e impede reutilização do código", async ({
  page,
  browser,
  request,
}) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
  const { link } = await (
    await request.get(
      "http://127.0.0.1:54329/_test/email-link?email=teste%40example.test",
    )
  ).json();
  const verified = await request.get(link, { maxRedirects: 0 });
  expect(verified.status()).toBe(302);
  const callback = verified.headers().location + "&next=https://example.org";
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(callback);
  await expect(otherPage).toHaveURL(/\/entrar\?link=invalido$/);
  await page.goto(callback);
  await expect(page).toHaveURL(/\/nova-senha$/);
  await otherPage.goto(callback);
  await expect(otherPage).toHaveURL(/\/entrar\?link=invalido$/);
  await other.close();
});

test("código com verificador adulterado não cria sessão", async ({
  page,
  context,
}) => {
  await page.goto("/cadastro");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("adulterado@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByLabel("Confirme a senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se o cadastro puder ser concluído",
  );
  const verifiers = (await context.cookies()).filter((c) =>
    c.name.includes("-code-verifier"),
  );
  expect(verifiers.length).toBeGreaterThan(0);
  await context.addCookies(
    verifiers.map((verifier) => ({
      ...verifier,
      value:
        "base64-" +
        Buffer.from(JSON.stringify("verificador-adulterado")).toString(
          "base64url",
        ),
    })),
  );
  const { link } = await (
    await page.request.get(
      "http://127.0.0.1:54329/_test/email-link?email=adulterado%40example.test",
    )
  ).json();
  await page.goto(link);
  await expect(page).toHaveURL(/\/entrar\?link=invalido$/);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});
