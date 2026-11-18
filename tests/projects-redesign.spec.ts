import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("projetos v2: estados reais, calendário, diálogos, confirmação, paginação e histórico", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const shift = (n: number) =>
    new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const token = await (
    await page.request.post(
      "http://127.0.0.1:54329/auth/v1/token?grant_type=password",
      {
        data: {
          email: "projects-v2@example.test",
          password: "senha-de-teste-123",
        },
      },
    )
  ).json();
  const headers = {
    authorization: `Bearer ${token.access_token}`,
    apikey: "sb_publishable_teste",
  };
  async function post(table: string, data: unknown) {
    const r = await page.request.post(
      `http://127.0.0.1:54329/rest/v1/${table}`,
      { headers, data },
    );
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  }
  const archived = await post("rpc/create_project", {
    p_name: "Base anterior",
    p_starts_on: shift(-50),
    p_ends_on: shift(180),
    p_activate: false,
  });
  const patch = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${archived}`,
    { headers, data: { status: "ARCHIVED" } },
  );
  expect(patch.ok(), await patch.text()).toBe(true);
  await post("rpc/create_project", {
    p_name: "Maratona 2027",
    p_starts_on: shift(40),
    p_ends_on: shift(180),
    p_activate: false,
  });
  const active = await post("rpc/create_project", {
    p_name: "Projeto 30 Trincado",
    p_starts_on: shift(-30),
    p_ends_on: shift(180),
    p_water_ml: 3000,
    p_weight_mode: "target",
    p_weight_min: 88,
    p_sessions: 4,
  });
  await post("weights", [
    { project_id: active, logged_on: shift(-7), kg: 95.7 },
    { project_id: active, logged_on: shift(-1), kg: 94 },
  ]);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("projects-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/painel/projetos");
  const folder = `artifacts/diazen-v2/projects-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  async function capture(name: string) {
    await expect(page.locator(".app-loading")).toBeHidden();
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await expect(
      page.getByRole("heading", { name: "Projetos", exact: true, level: 1 }),
    ).toBeInViewport();
    await expect
      .poll(() =>
        page
          .locator(".dz-project-cover img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  async function feedback(text: string, error = false) {
    const dialog = page.locator(".record-feedback-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(text);
    await dialog
      .getByRole("button", {
        name: error ? "Voltar ao formulário" : "Continuar",
        exact: true,
      })
      .click();
    await expect(dialog).toBeHidden();
  }
  const hero = page.locator(".dz-project-card.is-featured");
  await expect(hero).toContainText("94 kg");
  await expect(hero).toContainText("88 kg");
  await expect(hero).toContainText("-1,7 kg");
  await expect(hero.getByRole("progressbar")).toHaveAttribute("value", "15");
  await expect(
    page.getByRole("navigation", { name: "Estados dos projetos" }),
  ).toContainText("Ativo (1)");
  await capture("light-1672");
  await page
    .getByRole("button", { name: "Ativar modo escuro no desktop" })
    .click();
  await capture("dark-1672");
  await page
    .getByRole("button", { name: "Ativar modo claro no desktop" })
    .click();
  for (const width of [320, 390, 768, 1366, 1672]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 941 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await capture(`viewport-${width}`);
  }
  const manage = hero.getByRole("button", {
    name: "Gerenciar Projeto 30 Trincado",
    exact: true,
  });
  await manage.click();
  const management = page.locator(".dz-project-dialog[open]");
  await expect(management).toBeVisible();
  await management
    .getByRole("button", { name: "Concluir projeto", exact: true })
    .click();
  expect(
    (await (await page.request.get("/api/exportar")).json()).projects.find(
      (p: { id: string }) => p.id === active,
    ).status,
  ).toBe("ACTIVE");
  await page.keyboard.press("Escape");
  await expect(manage).toBeFocused();
  await page
    .getByRole("button", { name: "Criar novo projeto", exact: true })
    .click();
  const create = page.locator("#new-project");
  await create
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Próxima fase");
  await create.getByLabel("Meta diária de água (ml)").fill("2500");
  await create
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await feedback("Já existe um projeto ativo", true);
  await expect(
    create.getByLabel("Nome do projeto", { exact: true }),
  ).toHaveValue("Próxima fase");
  await create.getByLabel("Salvar como rascunho, sem ativar").check();
  await create
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await feedback("Projeto criado");
  await expect(create).toBeHidden();
  await page
    .getByRole("button", { name: "Criar novo projeto", exact: true })
    .click();
  await expect(
    create.getByLabel("Nome do projeto", { exact: true }),
  ).toHaveValue("");
  await page.keyboard.press("Escape");
  await manage.click();
  await management
    .locator(".project-state-action")
    .getByRole("checkbox")
    .check();
  await management
    .getByRole("button", { name: "Concluir projeto", exact: true })
    .click();
  await feedback("Projeto atualizado");
  await expect(hero).toHaveCount(0);
  const old = page.locator(".dz-project-card").filter({
    has: page.getByRole("heading", {
      name: "Projeto 30 Trincado",
      exact: true,
    }),
  });
  await expect(old).toContainText("Concluído");
  await old
    .getByRole("button", { name: "Gerenciar Projeto 30 Trincado", exact: true })
    .click();
  await expect(management).toContainText("Projeto somente leitura");
  await expect(
    management.getByRole("button", { name: "Concluir projeto", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await old
    .getByRole("link", {
      name: "Consultar projeto Projeto 30 Trincado",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Histórico somente leitura.", { exact: false }),
  ).toBeVisible();
  for (let n = 0; n < 22; n++)
    await post("rpc/create_project", {
      p_name: `Fase planejada ${n + 1}`,
      p_starts_on: shift(50 + n),
      p_ends_on: shift(180),
      p_activate: false,
    });
  await page.goto("/painel/projetos?estado=DRAFT");
  await expect(
    page.getByRole("navigation", { name: "Estados dos projetos" }),
  ).toContainText("Planejados (24)");
  await expect(page.locator(".dz-project-card")).toHaveCount(20);
  const before = await (await page.request.get("/api/exportar")).json();
  await page
    .getByRole("link", { name: "Próximos projetos", exact: true })
    .click();
  await expect(page.locator(".dz-project-card")).toHaveCount(4);
  const after = await (await page.request.get("/api/exportar")).json();
  expect(after.projects).toEqual(before.projects);
  await page.goto("/painel/projetos?estado=ACTIVE");
  await expect(page.locator(".dz-project-empty")).toContainText(
    "Nenhum projeto nesta consulta",
  );
  await capture("empty-active-1672");
  expect(errors).toEqual([]);
});
