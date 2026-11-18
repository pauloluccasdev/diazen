import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });

test("autenticação v2: boas-vindas responsivas, apresentações, temas persistidos e ações reais", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("Evolução com");
  await page.getByRole("button", { name: /^Apresentação 2:/ }).click();
  await expect(heading).toContainText("Seu dia,");
  await page.getByRole("button", { name: /^Apresentação 3:/ }).click();
  await expect(heading).toContainText("Uma rotina");
  await page.getByRole("button", { name: /^Apresentação 1:/ }).click();
  const folder = `artifacts/diazen-v2/auth-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  async function capture(name: string) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() =>
        page
          .locator(".auth-welcome-image img")
          .evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const width of [320, 390, 768, 1366, 1672]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 941 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (width === 390 || width === 768 || width === 1672)
      await capture(`welcome-light-${width}`);
  }
  await page
    .getByRole("button", { name: "Ativar modo escuro no desktop", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".auth-experience")).toHaveAttribute(
    "data-desktop-theme",
    "dark",
  );
  await capture("welcome-dark-1672");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Ativar modo claro no desktop", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Criar conta gratuita", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Entrar na minha conta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(errors).toEqual([]);
});
