import { expect, test } from "@playwright/test";

for (const width of [320, 375, 390, 430, 768, 1280]) {
  test(`abertura sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".area-grid article")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("atalho de teclado e navegação para primeiros passos", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "Conhecer os primeiros passos" })
    .click();
  await expect(page).toHaveURL(/#primeiros-passos$/);
  await expect(
    page.getByRole("heading", { name: "Pequenos passos, um novo ritmo." }),
  ).toBeInViewport();
});

test("manifesto e ícones instaláveis", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
});

test("offline avisa indisponibilidade e armazena somente fallback público", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // O worker passa a controlar a navegação após a próxima carga.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cachedUrls).toEqual(["/offline.html"]);
  await context.setOffline(true);
  await expect(page.getByRole("status")).toContainText("Sem conexão");
  const response = await page.goto("/nao-armazenado");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Você está sem conexão." }),
  ).toBeVisible();
});

test("cabeçalhos de proteção e saúde sem dados privados", async ({
  request,
}) => {
  const response = await request.get("/api/saude");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({
    status: "ok",
    service: "diazen",
    version: "0.1.0",
  });
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  const denied = await request.post("/api/fotos", {
    headers: { Origin: "https://origem-invalida.example" },
  });
  expect(denied.status()).toBe(403);
});
