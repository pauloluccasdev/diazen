import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
test("perfil v2: referências configuradas, nome inválido e recuperação de indisponibilidade", async ({
  page,
  request,
}) => {
  const email = "profile-other-v2@example.test";
  const backend = "http://127.0.0.1:54329";
  const token = await (
    await request.post(`${backend}/auth/v1/token?grant_type=password`, {
      data: { email, password: "senha-de-teste-123" },
    })
  ).json();
  const headers = {
    authorization: `Bearer ${token.access_token}`,
    apikey: "sb_publishable_teste",
  };
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const created = await request.post(`${backend}/rest/v1/rpc/create_project`, {
    headers,
    data: {
      p_name: "Projeto de referências",
      p_starts_on: date,
      p_water_ml: 3200,
      p_sessions: 4,
      p_weight_mode: "target",
      p_weight_min: 88,
    },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const project = await created.json();
  const weight = await request.post(`${backend}/rest/v1/weights`, {
    headers,
    data: { project_id: project, logged_on: date, kg: 94 },
  });
  expect(weight.ok(), await weight.text()).toBe(true);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/painel/perfil?secao=metas");
  const goals = page.getByRole("region", {
    name: "Objetivos e metas",
    exact: true,
  });
  await expect(goals).toContainText("Projeto de referências");
  await expect(goals).toContainText("94 kg");
  await expect(goals).toContainText("88 kg");
  await expect(goals).toContainText("3.200 ml");
  await expect(goals).toContainText("4 sessões");
  await page.goto("/painel/perfil?secao=perfil");
  const name = page.getByLabel("Nome de exibição (opcional)");
  const invalid = "a".repeat(81);
  await name.fill(invalid);
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  const feedback = page.locator(".record-feedback-dialog");
  await expect(feedback).toContainText(/80/);
  await feedback
    .getByRole("button", { name: "Voltar ao formulário", exact: true })
    .click();
  await expect(name).toHaveValue(invalid);
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await page.context().setOffline(true);
  try {
    await expect(name).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Salvar alterações", exact: true }),
    ).toBeDisabled();
  } finally {
    await page.context().setOffline(false);
  }
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue(invalid);
  const hook = `${backend}/_test/read-failure/00000000-0000-4000-8000-000000000062/`;
  try {
    await request.get(hook + "on");
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Não foi possível carregar.",
        exact: true,
      }),
    ).toBeVisible();
    await request.get(hook + "off");
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .click();
    await expect(name).toBeVisible();
  } finally {
    await request.get(hook + "off");
  }
});
test("perfil v2: identidade opcional, avatar privado, temas e navegação responsiva", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("profile-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/painel/perfil");
  await expect(page.locator(".app-loading")).toBeHidden();
  await expect(page.locator(".profile-identity h2")).toHaveText("Minha conta");
  const name = page.getByLabel("Nome de exibição (opcional)");
  await name.fill("Paulo · Conta de demonstração");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  const feedback = page.locator(
    ".record-feedback-dialog:not(.profile-avatar-confirm)",
  );
  await expect(feedback).toContainText("Nome de exibição atualizado.");
  await feedback
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(page.locator(".profile-identity h2")).toHaveText(
    "Paulo · Conta de demonstração",
  );
  const folder = `artifacts/diazen-v2/profile-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  async function capture(label: string) {
    await expect(page.locator(".app-loading")).toBeHidden();
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${folder}/${label}.png`,
      animations: "disabled",
    });
  }
  await capture("desktop-light-1672");
  await page.getByLabel("Tema do desktop").selectOption("dark");
  await expect(
    page.getByRole("button", { name: "Ativar modo claro no desktop" }),
  ).toBeVisible();
  await capture("desktop-dark-1672");
  await page.getByLabel("Tema do desktop").selectOption("light");
  for (const width of [320, 390, 768, 1366, 1672]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 941 });
    if (width >= 1024)
      await page.locator("#preferencias").scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator("#preferencias")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      )
      .toBe(width >= 1024 ? "rgb(255, 255, 255)" : "rgb(28, 29, 32)");
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
    if (width === 390 || width === 768) await capture(`overview-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(name).toBeHidden();
  await page
    .getByRole("navigation", { name: "Configurações da conta" })
    .getByRole("link", { name: /Dados pessoais/ })
    .click();
  await expect(name).toBeVisible();
  await page.locator("#profile-avatar > summary").click();
  const file = page.getByLabel("Foto de perfil (JPG, PNG ou WebP)");
  await file.setInputFiles({
    name: "avatar-sintetico.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 480, height: 640, channels: 3, background: "#845923" },
    })
      .png()
      .toBuffer(),
  });
  await expect(
    page.getByAltText("Pré-visualização da foto selecionada"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar foto de perfil", exact: true })
    .click();
  await expect(feedback).toContainText(/foto/i);
  await feedback
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(
    page.getByAltText("Pré-visualização da foto selecionada"),
  ).toBeHidden();
  await expect(file).toHaveValue("");
  expect((await page.request.get("/api/perfil/avatar")).status()).toBe(200);
  await page
    .getByRole("button", { name: "Remover foto de perfil", exact: true })
    .click();
  const removal = page.locator(".profile-avatar-confirm");
  await expect(
    removal.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(removal).toBeHidden();
  expect((await page.request.get("/api/perfil/avatar")).status()).toBe(200);
  await page
    .getByRole("button", { name: "Remover foto de perfil", exact: true })
    .click();
  await removal.getByRole("checkbox").check();
  await removal
    .getByRole("button", { name: "Confirmar remoção", exact: true })
    .click();
  await expect(feedback).toContainText(/foto/i);
  await feedback
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  expect((await page.request.get("/api/perfil/avatar")).status()).toBe(404);
  await name.fill("");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(feedback).toContainText("Nome de exibição removido.");
  await feedback
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  const exported = await (await page.request.get("/api/exportar")).json();
  expect(exported.profiles[0].display_name).toBeNull();
  expect(exported.profiles[0].avatar_id).toBeNull();
  expect(errors).toEqual([]);
});
