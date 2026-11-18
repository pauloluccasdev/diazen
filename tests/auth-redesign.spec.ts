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

test("autenticação v2: nome opcional persiste após confirmação, erros preservam edição e remoção prevalece na exportação", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const email = "auth-identity-v2@example.test";
  const password = "senha-de-teste-123";
  await page.goto("/cadastro");
  const name = page.getByLabel("Nome de exibição (opcional)");
  const emailField = page.getByLabel("E-mail", { exact: true });
  const passwordField = page.getByLabel("Senha", { exact: true });
  await name.fill("a".repeat(81));
  await emailField.fill(email);
  await passwordField.fill(password);
  await page.getByLabel("Confirme a senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.locator(".auth-v2-form").getByRole("alert")).toContainText(
    "80 caracteres",
  );
  await expect(name).toHaveValue("a".repeat(81));
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(emailField).toHaveValue(email);
  await expect(passwordField).toHaveValue(password);
  await name.fill("  Pessoa de demonstração  ");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se o cadastro puder ser concluído",
  );
  await expect(name).toHaveValue("");
  await expect(emailField).toHaveValue("");
  await expect(passwordField).toHaveValue("");
  const { link } = await (
    await request.get(
      `http://127.0.0.1:54329/_test/email-link?email=${encodeURIComponent(email)}`,
    )
  ).json();
  await page.goto(link);
  await expect(page).toHaveURL(/\/painel$/);
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.account.email).toBe(email);
  expect(exported.account.display_name).toBe("Pessoa de demonstração");
  expect(exported.profiles).toEqual([]);
  await page.goto("/painel/perfil?secao=perfil");
  await expect(page.getByLabel("Nome de exibição (opcional)")).toHaveValue(
    "Pessoa de demonstração",
  );
  await page.getByLabel("Nome de exibição (opcional)").fill("");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  const feedback = page.locator(".record-feedback-dialog");
  await expect(feedback).toContainText("Nome de exibição removido.");
  await feedback
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  expect(
    (await (await page.request.get("/api/exportar")).json()).account
      .display_name,
  ).toBeNull();
  await page.goto("/painel/perfil");
  await page
    .locator(".profile-signout")
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/cadastro");
  await page
    .getByLabel("Nome de exibição (opcional)")
    .fill("Nome que não deve sobrescrever");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirme a senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se o cadastro puder ser concluído",
  );
  const token = await (
    await request.post(
      "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
      { data: { email, password } },
    )
  ).json();
  expect(token.user.id).toBe(exported.account.id);
  expect(token.user.user_metadata.display_name).toBe("Pessoa de demonstração");
});

test("autenticação v2: formulários claros/escuros, teclado, feedback e cinco larguras sem overflow", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const folder = `artifacts/diazen-v2/auth-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  async function capture(name: string) {
    await expect(page.locator(".app-loading")).toBeHidden();
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const path of ["entrar", "cadastro", "recuperar-senha"]) {
    await page.goto(`/${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("auth-redesign@example.test");
    if (path !== "recuperar-senha")
      await page
        .getByLabel("Senha", { exact: true })
        .fill("senha-de-teste-123");
    if (path === "cadastro") {
      await page
        .getByLabel("Nome de exibição (opcional)")
        .fill("Pessoa de demonstração");
      await page
        .getByLabel("Confirme a senha", { exact: true })
        .fill("senha-de-teste-123");
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
      if (width === 390 || width === 1672)
        await capture(`${path}-light-${width}`);
    }
    await page
      .getByRole("button", {
        name: "Ativar modo escuro no desktop",
        exact: true,
      })
      .click();
    await capture(`${path}-dark-1672`);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", {
        name: "Ativar modo claro no desktop",
        exact: true,
      })
      .click();
  }
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("auth-redesign@example.test");
  await page.getByRole("button", { name: "Enviar link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("");
  await capture("recovery-success-1672");
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("auth-redesign@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/nova-senha");
  await expect(
    page.getByRole("heading", { name: "Escolha sua nova senha.", exact: true }),
  ).toBeVisible();
  await capture("new-password-light-1672");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await capture("new-password-390");
  expect(errors).toEqual([]);
});
