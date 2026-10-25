import { expect, test } from "@playwright/test";

test("projetos mostram metas condicionais, explicam início futuro e destacam navegação", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("projetos-validacao@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const nav = page.getByRole("navigation", { name: "Navegação do painel" });
  await expect(
    nav.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Minha conta", exact: true }).click();
  await expect(
    nav.getByRole("link", { name: "Minha conta", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Projetos", exact: true }).click();
  const active = nav.getByRole("link", { name: "Projetos", exact: true });
  await expect(active).toHaveAttribute("aria-current", "page");
  expect(await active.evaluate((el) => getComputedStyle(el).color)).not.toBe(
    await nav
      .getByRole("link", { name: "Dashboard", exact: true })
      .evaluate((el) => getComputedStyle(el).color),
  );
  const form = page.locator(".project-create form");
  const disclosure = form.locator("details.form-disclosure");
  const start = form.getByLabel("Início", { exact: true });
  const today = await start.inputValue();
  const next = new Date(today + "T12:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);
  await form
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Projeto validado");
  await form.getByLabel("Acompanhamento de peso").selectOption("track");
  await expect(
    form.locator('[name="weight_min"], [name="weight_max"]'),
  ).toHaveCount(0);
  await form
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText(
    "Apenas acompanhar peso não define uma meta numérica",
  );
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(form.getByLabel("Nome do projeto", { exact: true })).toHaveValue(
    "Projeto validado",
  );
  await expect(form.getByLabel("Acompanhamento de peso")).toHaveValue("track");
  await form.getByLabel("Meta diária de água (ml)").fill("4000");
  await form.getByLabel("Acompanhamento de peso").selectOption("target");
  await expect(form.getByLabel("Alvo ou mínimo (kg)")).toHaveAttribute(
    "required",
    "",
  );
  await expect(form.locator('[name="weight_max"]')).toHaveCount(0);
  await form.getByLabel("Acompanhamento de peso").selectOption("range");
  await form.getByLabel("Alvo ou mínimo (kg)").fill("84");
  await form.getByLabel("Máximo da faixa (kg)").fill("90");
  await expect(form.getByLabel("Máximo da faixa (kg)")).toHaveAttribute(
    "required",
    "",
  );
  await start.fill(tomorrow);
  await form.getByLabel("Fim previsto (opcional)").fill("2027-09-30");
  await expect(start).not.toHaveAttribute("max");
  await expect(
    form.getByText(/Projeto planejado: será salvo como rascunho/),
  ).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const input of await form.locator('input[type="date"]').all()) {
      const contained = await input.evaluate((el) => {
        const child = el.getBoundingClientRect();
        const parent = el.parentElement!.getBoundingClientRect();
        return child.left >= parent.left - 1 && child.right <= parent.right + 1;
      });
      expect(contained).toBe(true);
    }
  }
  await expect(start).not.toHaveAttribute("max");
  await form
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("rascunho planejado");
  await expect(disclosure).not.toHaveAttribute("open");
  await expect(disclosure.locator("summary")).toBeFocused();
  await expect(form.getByLabel("Nome do projeto", { exact: true })).toHaveValue(
    "",
  );
  await expect(start).toHaveValue(today);
  await expect(form.getByLabel("Fim previsto (opcional)")).toHaveValue("");
  await expect(form.getByLabel("Meta diária de água (ml)")).toHaveValue("");
  await expect(form.getByLabel("Acompanhamento de peso")).toHaveValue("none");
  await expect(
    form.locator('[name="weight_min"], [name="weight_max"]'),
  ).toHaveCount(0);
  await expect(
    form.getByLabel("Salvar como rascunho, sem ativar"),
  ).not.toBeChecked();
  const draft = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Projeto validado", exact: true }),
  });
  await expect(draft.getByText("Rascunho", { exact: true })).toBeVisible();
  await page.reload();
  await expect(draft).toBeVisible();
  await expect(draft.getByText("Rascunho", { exact: true })).toBeVisible();
  await draft
    .getByRole("button", { name: "Ativar projeto", exact: true })
    .click();
  await expect(draft.getByRole("alert")).toContainText("início está no futuro");
  await disclosure.locator("summary").click();
  await start.fill(today);
  await form.getByLabel("Meta diária de água (ml)").fill("4000");
  await form
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Água e acompanhamento");
  await form.getByLabel("Acompanhamento de peso").selectOption("track");
  await form
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("Projeto criado");
  await expect(disclosure).not.toHaveAttribute("open");
  await disclosure.locator("summary").click();
  await expect(form.getByLabel("Nome do projeto", { exact: true })).toHaveValue(
    "",
  );
  await expect(form.getByLabel("Acompanhamento de peso")).toHaveValue("none");
  const activeCard = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "Água e acompanhamento",
      exact: true,
    }),
  });
  await expect(
    activeCard.getByText("Em andamento", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    activeCard.getByText("Em andamento", { exact: true }),
  ).toBeVisible();
});
