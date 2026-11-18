import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
test.use({ serviceWorkers: "block" });
test("fotos v2: galeria privada, posições, datas, comparação real, zoom e upload", async ({
  page,
  request,
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
          email: "photos-v2@example.test",
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
  const project = await post("rpc/create_project", {
    p_name: "Projeto 30 Trincado",
    p_starts_on: shift(-60),
    p_ends_on: shift(180),
    p_water_ml: 3000,
  });
  await post("weights", [
    { project_id: project, logged_on: shift(-28), kg: 96.1 },
    { project_id: project, logged_on: shift(-1), kg: 94 },
  ]);
  await post("measurements", [
    {
      project_id: project,
      logged_on: shift(-28),
      measurement_type: "waist",
      value_cm: 92,
    },
    {
      project_id: project,
      logged_on: shift(-1),
      measurement_type: "waist",
      value_cm: 88.5,
    },
  ]);
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("photos-v2@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  // Existing fictional editorial asset is uploaded only to this isolated QA account.
  const back = await readFile(
    new URL("../public/images/athlete-project-v2.webp", import.meta.url),
  );
  const plain = await sharp({
    create: { width: 120, height: 180, channels: 3, background: "#30343b" },
  })
    .png()
    .toBuffer();
  async function upload(
    day: string,
    category: string,
    buffer: Buffer,
    mimeType = "image/webp",
  ) {
    const r = await page.request.post("/api/fotos", {
      headers: { origin: "http://127.0.0.1:3100" },
      multipart: {
        logged_on: day,
        category,
        file: { name: "synthetic-qa.webp", mimeType, buffer },
      },
    });
    expect(r.status(), await r.text()).toBe(201);
  }
  for (const day of [-1, -7, -14, -21, -28])
    await upload(shift(day), "back", back);
  for (const pose of ["front", "side", "other"])
    await upload(shift(-1), pose, plain, "image/png");
  const url = `/painel/fotos?projeto=${project}&categoria=back`;
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto(url);
  await expect(page.locator(".app-loading")).toBeHidden();
  await expect(
    page.getByRole("heading", {
      name: "Fotos de evolução",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".photo-count")).toContainText("8 fotos");
  await expect(page.locator(".photo-count")).toContainText(
    "5 datas registradas",
  );
  await expect(
    page
      .locator(".photo-positions")
      .getByRole("link", { name: "Costas 5 fotos", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.locator(".photo-grid article")).toHaveCount(4);
  await expect(page.locator(".photo-grid article img")).toHaveCount(4);
  const changes = page.locator(".photo-changes");
  await expect(changes).toContainText("96,1 kg → 94 kg");
  await expect(changes).toContainText("-2,1 kg");
  await expect(changes).toContainText("92 cm → 88,5 cm");
  await expect(changes).toContainText("-3,5 cm");
  await expect(changes).toContainText("sem avaliação registrada");
  const before = await (await page.request.get("/api/exportar")).json();
  expect(before.photos).toHaveLength(8);
  const folder = `artifacts/diazen-v2/photos-fiel/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  async function capture(name: string) {
    await expect(page.locator(".app-loading")).toBeHidden();
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await expect(
      page.getByRole("heading", {
        name: "Fotos de evolução",
        level: 1,
        exact: true,
      }),
    ).toBeInViewport();
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>("img")]
            .filter((image) => {
              const r = image.getBoundingClientRect();
              return (
                r.width > 0 &&
                r.height > 0 &&
                r.top < innerHeight &&
                r.bottom > 0
              );
            })
            .every(
              (image) =>
                image.complete &&
                image.naturalWidth > 0 &&
                image
                  .closest(".photo-image-button")
                  ?.getAttribute("aria-busy") !== "true",
            ),
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      animations: "disabled",
    });
  }
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Ativar modo escuro no desktop" })
        .click();
    for (const width of [1672, 1366]) {
      await page.setViewportSize({ width, height: 941 });
      await capture(`${theme}-${width}`);
    }
  }
  for (const width of [320, 390, 768, 1672]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 941 });
    await capture(`viewport-${width}`);
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
  }
  // A middle photo is not already loaded at full size by the default comparison.
  const first = page.locator(".photo-grid article").nth(1);
  const imageButton = first.getByRole("button", { name: /^Ampliar foto/ });
  const imageUrl = await first.locator("img").getAttribute("src");
  expect(imageUrl).toBeTruthy();
  expect((await request.get(imageUrl!)).status()).toBe(401);
  const privateFile = await page.request.get(imageUrl!);
  expect(privateFile.status()).toBe(200);
  expect(privateFile.headers()["cache-control"]).toContain("no-store");
  expect(privateFile.headers()["content-type"]).toBe("image/webp");
  const fullUrl = new URL(imageUrl!, page.url());
  fullUrl.search = "";
  await page.route(fullUrl.href, (route) =>
    route.fulfill({
      status: 503,
      body: "",
      headers: { "cache-control": "no-store" },
    }),
  );
  await imageButton.click();
  const viewer = page.getByRole("dialog", { name: "Costas", exact: true });
  await expect(viewer).toBeVisible();
  const viewerBounds = await viewer.boundingBox();
  expect(viewerBounds).not.toBeNull();
  expect(
    Math.abs(viewerBounds!.x + viewerBounds!.width / 2 - 836),
  ).toBeLessThan(2);
  await expect(viewer.getByRole("alert")).toContainText(
    "Não foi possível carregar esta fotografia",
  );
  await expect(
    viewer.getByRole("button", { name: "Ampliar imagem", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `${folder}/viewer-error-1672.png`,
    animations: "disabled",
  });
  await page.unroute(fullUrl.href);
  await viewer
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect
    .poll(() =>
      viewer
        .locator("img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await expect(viewer.locator(".photo-viewer-stage")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.screenshot({
    path: `${folder}/viewer-1672.png`,
    animations: "disabled",
  });
  await viewer
    .getByRole("button", { name: "Ampliar imagem", exact: true })
    .click();
  await expect(viewer.locator(".photo-viewer-stage")).toHaveClass(/is-zoomed/);
  expect(
    await viewer
      .locator(".photo-viewer-stage")
      .evaluate(
        (el) =>
          el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth,
      ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(imageButton).toBeFocused();
  // Menu closes by Escape and keeps keyboard focus on its actual trigger.
  const menu = first.locator(".photo-card-menu");
  await menu.locator(":scope>summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(menu.locator(":scope>summary")).toBeFocused();
  await page
    .locator(".photo-pagination")
    .getByRole("link", { name: "Próximas", exact: true })
    .click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.locator(".photo-grid article")).toHaveCount(1);
  await expect(page.locator(".comparison-grid img")).toHaveCount(2);
  await page.goto(url);
  await page.locator(".photo-swap").click();
  await expect(page.locator(".photo-changes")).toContainText("+2,1 kg");
  await page
    .getByRole("navigation", { name: "Visualização das fotografias" })
    .getByRole("link", { name: "Comparar", exact: true })
    .click();
  await expect(page.locator(".photo-grid article")).toHaveCount(0);
  const ownPhotos = before.photos as {
    id: string;
    category: string;
    logged_on: string;
  }[];
  const middle = ownPhotos.find(
    (photo) => photo.category === "back" && photo.logged_on === shift(-7),
  );
  const recent = ownPhotos.find(
    (photo) => photo.category === "back" && photo.logged_on === shift(-1),
  );
  expect(middle).toBeDefined();
  expect(recent).toBeDefined();
  await page
    .getByRole("combobox", { name: "Foto 1", exact: true })
    .selectOption(middle!.id);
  await page
    .getByRole("combobox", { name: "Foto 2", exact: true })
    .selectOption(recent!.id);
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  const missingWeight = page
    .locator(".photo-change-row")
    .filter({ has: page.getByRole("heading", { name: "Peso", exact: true }) });
  await expect(missingWeight).toContainText("Sem registro → 94 kg");
  await expect(missingWeight.locator("strong")).toHaveCount(0);
  await capture("comparison-1672");
  await page
    .getByRole("navigation", { name: "Visualização das fotografias" })
    .getByRole("link", { name: "Galeria", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Visualização das fotografias" })
    .getByRole("link", { name: "Linha do tempo", exact: true })
    .click();
  await expect(page.locator(".photo-timeline .photo-date-row")).toHaveCount(5);
  await page.locator(".photo-timeline .photo-date-row").first().click();
  await expect(page).toHaveURL(new RegExp(`dia=${shift(-1)}`));
  await expect(page.locator(".photo-grid article")).toHaveCount(1);
  await page.goto(url);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Escolher data do diário", exact: true })
    .click();
  const dateForm = page.locator(".dz-date-form");
  await dateForm.getByLabel("Escolher data", { exact: true }).fill(shift(-7));
  await dateForm
    .getByRole("button", { name: "Consultar data", exact: true })
    .click();
  await expect(page).toHaveURL(/categoria=back/);
  await expect(page).toHaveURL(new RegExp(`data=${shift(-7)}`));
  await expect(page.locator(".photo-query-date")).toContainText(
    shift(-7).split("-").reverse().join("/"),
  );
  const afterRead = await (await page.request.get("/api/exportar")).json();
  expect(afterRead.photos).toEqual(before.photos);
  expect(afterRead.weights).toEqual(before.weights);
  expect(afterRead.measurements).toEqual(before.measurements);
  await page.goto(url);
  await page
    .getByRole("link", { name: "Adicionar fotos", exact: true })
    .click();
  const uploadForm = page.locator(".photo-upload form");
  await uploadForm
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("back");
  await uploadForm.getByLabel("Imagem (JPG, PNG ou WebP)").setInputFiles({
    name: "synthetic-ui.png",
    mimeType: "image/png",
    buffer: plain,
  });
  await uploadForm
    .getByRole("button", { name: "Salvar foto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Foto salva com privacidade",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(uploadForm.getByLabel("Imagem (JPG, PNG ou WebP)")).toHaveValue(
    "",
  );
  expect(
    (await (await page.request.get("/api/exportar")).json()).photos,
  ).toHaveLength(9);
  const newest = page.locator(".photo-grid article").first();
  await newest.locator(".photo-card-menu>summary").click();
  await newest
    .locator("summary")
    .getByText("Excluir foto", { exact: true })
    .click();
  await newest.getByLabel("Confirmo a exclusão desta foto.").check();
  await newest
    .getByRole("button", { name: "Excluir foto", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/exportar")).json()).photos.length,
    )
    .toBe(8);
  const closed = await page.request.patch(
    `http://127.0.0.1:54329/rest/v1/projects?id=eq.${project}`,
    { headers, data: { status: "COMPLETED" } },
  );
  expect(closed.ok()).toBe(true);
  await page.goto(url);
  await expect(page.locator(".readonly-note")).toContainText(
    "Projeto somente leitura",
  );
  await expect(page.locator(".photo-upload")).toHaveCount(0);
  await expect(page.locator(".photo-record .destructive-action")).toHaveCount(
    0,
  );
  expect((await page.request.get(imageUrl!)).status()).toBe(200);
  const draft = await post("rpc/create_project", {
    p_name: "Galeria futura",
    p_starts_on: shift(7),
    p_ends_on: shift(40),
    p_activate: false,
  });
  await page.goto(`/painel/fotos?projeto=${draft}`);
  await expect(page.locator(".photo-latest")).toContainText(
    "Nenhuma fotografia",
  );
  await expect(page.locator(".photo-grid article")).toHaveCount(0);
  await expect(page.locator(".photo-upload")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Comparar", exact: true }),
  ).toBeDisabled();
  await capture("empty-draft-390");
  expect(errors).toEqual([]);
});
