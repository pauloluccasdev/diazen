import { expect, test } from "@playwright/test";
import sharp from "sharp";
test("fotos privadas: upload, comparação, exclusão e acesso a histórico", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("fotos@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Fotos E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/fotos");
  await page.getByText("Adicionar foto", { exact: true }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar foto", exact: true }),
  });
  const png = await sharp({
    create: { width: 100, height: 150, channels: 3, background: "#FF9F24" },
  })
    .png()
    .toBuffer();
  await request.get(
    "http://127.0.0.1:54329/_test/fail-photo-reply/00000000-0000-4000-8000-000000000003",
  );
  for (let i = 0; i < 2; i++) {
    if (
      !(await form
        .getByRole("button", { name: "Salvar foto", exact: true })
        .isVisible())
    )
      await page.getByText("Adicionar foto", { exact: true }).click();
    await form.getByLabel("Imagem (JPG, PNG ou WebP)").setInputFiles({
      name: `teste${i}.png`,
      mimeType: "image/png",
      buffer: png,
    });
    await form
      .getByRole("button", { name: "Salvar foto", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(i + 1);
  }
  expect(
    await (
      await request.get(
        "http://127.0.0.1:54329/_test/photo-reply-status/00000000-0000-4000-8000-000000000003",
      )
    ).json(),
  ).toEqual({ pending: false });
  const images = page.getByRole("article").locator("img");
  const urls = await images.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("src")!),
  );
  const ids = urls.map((url) => url.split("/").at(-1)!.split("?")[0]);
  for (const url of urls)
    expect((await page.request.get(url)).status()).toBe(200);
  const response = await page.request.get(urls[0]);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["content-type"]).toBe("image/webp");
  expect((await request.get(urls[0])).status()).toBe(401);
  await page
    .getByRole("combobox", { name: "Foto 1", exact: true })
    .selectOption(ids[0]);
  await page
    .getByRole("combobox", { name: "Foto 2", exact: true })
    .selectOption(ids[1]);
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await expect(page.locator(".comparison-grid img")).toHaveCount(2);
  const first = page.getByRole("article").first();
  await first
    .locator("summary")
    .getByText("Excluir foto", { exact: true })
    .click();
  await first.getByLabel("Confirmo a exclusão desta foto.").check();
  await first
    .getByRole("button", { name: "Excluir foto", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect((await page.request.get(urls[0])).status()).toBe(404);
  await page.goto("/painel/projetos");
  const project = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Fotos E2E", exact: true }),
  });
  await project
    .getByLabel("Entendo que o projeto ficará somente leitura.")
    .first()
    .check();
  await project
    .getByRole("button", { name: "Concluir projeto", exact: true })
    .click();
  await expect(project.getByText("Concluído", { exact: true })).toBeVisible();
  await page.goto("/painel/fotos");
  await expect(
    page.getByText("Projeto somente leitura.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar foto", exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get(urls[1])).status()).toBe(200);
  await page.goto("/painel");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  expect((await page.request.get(urls[1])).status()).toBe(404);
});
