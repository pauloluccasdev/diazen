import { test, expect } from "@playwright/test";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
test("exclusão exige modal, nome e confirmação; cancela, bloqueia offline e remove os registros", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("project-delete@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Excluir QA");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  await page.goto("/painel/agua");
  await page.locator(".record-create > summary").click();
  const water = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar registro", exact: true }),
  });
  await water.getByLabel("Volume (ml)").fill("250");
  await water
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "250 ml", level: 2, exact: true }),
  ).toBeVisible();
  await page.goto("/painel/fotos");
  await page.getByText("Adicionar foto", { exact: true }).click();
  const photo = page.locator("form").filter({
    has: page.getByRole("button", { name: "Salvar foto", exact: true }),
  });
  const png = await sharp({
    create: { width: 100, height: 150, channels: 3, background: "#FF9F24" },
  })
    .png()
    .toBuffer();
  await photo.getByLabel("Imagem (JPG, PNG ou WebP)").setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: png,
  });
  await photo.getByRole("button", { name: "Salvar foto", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  const photoUrl = await page
    .getByRole("article")
    .locator("img")
    .getAttribute("src");
  await page.goto("/painel/projetos");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Excluir QA", exact: true }),
  });
  const projectHref = await card
    .getByRole("link", { name: "Consultar projeto" })
    .getAttribute("href");
  const projectId = new URL(projectHref!, "http://localhost").searchParams.get(
    "projeto",
  );
  await card
    .getByRole("button", { name: "Excluir projeto", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Excluir projeto?",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Metas e versões do plano alimentar");
  await expect(
    modal.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Excluir projeto", exact: true })
    .click();
  await modal.getByRole("textbox").fill("Nome incorreto");
  await modal.getByRole("checkbox").check();
  await modal
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toContainText(
    "Não foi possível excluir",
  );
  await modal.getByRole("textbox").fill("Excluir QA");
  await modal.getByRole("checkbox").check();
  await context.setOffline(true);
  await expect(
    modal.getByRole("button", { name: "Excluir definitivamente", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.setViewportSize({ width: 320, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/project-delete-dialog-320.png" });
  await modal
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(page).toHaveURL(/\/painel\/projetos\?excluido=1/);
  await expect(page.getByRole("status")).toContainText("Projeto excluído");
  await expect(page.locator("article")).toHaveCount(0);
  expect((await page.request.get(photoUrl!)).status()).toBe(404);
  const remaining = await request.post(
    "http://127.0.0.1:54329/storage/v1/object/list/body-photos",
    {
      headers: { apikey: "chave-secreta-de-teste" },
      data: {
        prefix: `00000000-0000-4000-8000-000000000020/${projectId}`,
        limit: 100,
        offset: 0,
      },
    },
  );
  expect(await remaining.json()).toEqual([]);
  await page.goto("/painel");
  await expect(
    page.getByRole("heading", { name: "Vamos preparar seu primeiro projeto?" }),
  ).toBeVisible();
});
