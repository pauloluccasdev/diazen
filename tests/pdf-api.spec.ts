import { test, expect } from "@playwright/test";
test("leitura temporária exige sessão/origem e não aceita arquivos inválidos", async ({
  page,
  request,
}) => {
  const endpoint = "/api/plano/ler",
    origin = "http://127.0.0.1:3100";
  const unauthorized = await request.post(endpoint, {
    headers: { Origin: origin, "Content-Type": "application/pdf" },
    data: "%PDF-1.4",
  });
  expect(unauthorized.status()).toBe(401);
  expect(unauthorized.headers()["cache-control"]).toContain("no-store");
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("plano-server@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  expect(
    (
      await page.request.post(endpoint, {
        headers: {
          Origin: "https://other.example",
          "Content-Type": "application/pdf",
        },
        data: "%PDF-1.4",
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(endpoint, {
        headers: { Origin: origin, "Content-Type": "application/pdf" },
        data: "not a pdf",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(endpoint, {
        headers: { Origin: origin, "Content-Type": "application/pdf" },
        data: Buffer.alloc(3 * 1024 * 1024 + 1),
      })
    ).status(),
  ).toBe(413);
});
