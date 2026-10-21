import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
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
  await expect(page.getByRole("heading", { name: "Bem-vindo à sua jornada." })).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("erros não revelam existência de conta", async ({ page }) => {
  await login(page, "teste@example.test", "senha-incorreta");
  const error = await page.getByRole("alert").textContent();
  await login(page, "inexistente@example.test", "senha-incorreta");
  await expect(page.getByRole("alert")).toHaveText(error!);
});

test("offline bloqueia envio de login", async ({ page, context }) => {
  await page.goto("/entrar");
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeDisabled();
});

test("login responsivo em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/entrar");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("cookie forjado não libera acesso ao painel", async ({ context, page }) => {
  await context.addCookies([{ name: "sb-127-auth-token", value: "sessao-forjada", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("página privada não entra no cache da PWA e logout offline é bloqueado", async ({ page, context }) => {
  await login(page, "teste@example.test", "senha-de-teste-123");
  await expect(page).toHaveURL(/\/painel$/);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const urls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)))).flat();
  });
  expect(urls).not.toContain("/painel");
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeDisabled();
});
