import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

test("telas essenciais acessíveis e sem overflow no mobile", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const capture = async (path: string) => {
    if (process.env.CAPTURE_REVIEW !== "1") return;
    const directory = join("artifacts", "visual-review", testInfo.project.name);
    await mkdir(directory, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.screenshot({
        path: join(
          directory,
          `${path.replaceAll("/", "_") || "inicio"}-${width}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/entrar",
    "/cadastro",
    "/recuperar-senha",
    "/privacidade",
    "/termos",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, `Acessibilidade: ${path}`).toEqual([]);
    await capture(path);
  }
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("acessibilidade@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/projetos");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Acessibilidade E2E");
  await page.getByLabel("Meta diária de água (ml)").fill("2000");
  await page
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Projeto criado");
  for (const path of [
    "/painel",
    "/painel/projetos",
    "/painel/agua",
    "/painel/peso",
    "/painel/medidas",
    "/painel/atividades",
    "/painel/alimentacao",
    "/painel/alimentos",
    "/painel/fotos",
    "/painel/perfil",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, `Acessibilidade: ${path}`).toEqual([]);
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow: ${path} em ${width}px`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(path);
  }
});
