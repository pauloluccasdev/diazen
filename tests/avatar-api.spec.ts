import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
test.use({ serviceWorkers: "block" });
test("avatar privado: origem, limites, RLS, respostas incertas, substituição e remoção por versão", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const origin = "http://127.0.0.1:3100",
    backend = "http://127.0.0.1:54329";
  const owner = "00000000-0000-4000-8000-000000000063";
  async function login(target: Page, email: string) {
    await target.goto("/entrar");
    await target.getByLabel("E-mail", { exact: true }).fill(email);
    await target
      .getByLabel("Senha", { exact: true })
      .fill("senha-de-teste-123");
    await target.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(target).toHaveURL(/\/painel$/);
  }
  async function token(email: string) {
    return (
      await (
        await request.post(`${backend}/auth/v1/token?grant_type=password`, {
          data: { email, password: "senha-de-teste-123" },
        })
      ).json()
    ).access_token;
  }
  const auth = {
    authorization: `Bearer ${await token("avatar-api@example.test")}`,
    apikey: "sb_publishable_teste",
  };
  expect(
    (
      await request.post(`${backend}/rest/v1/rpc/save_profile_name`, {
        headers: auth,
        data: { p_name: "Pessoa sintética" },
      })
    ).ok(),
  ).toBe(true);
  const bytes = async (background: string) =>
    sharp({ create: { width: 600, height: 800, channels: 3, background } })
      .jpeg()
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Artist: "metadado sintético" } },
      })
      .toBuffer();
  const green = await bytes("#267543"),
    red = await bytes("#b53245"),
    blue = await bytes("#235eb4");
  const upload = (target: Page, buffer: Buffer) =>
    target.request.post("/api/perfil/avatar", {
      headers: { origin },
      multipart: {
        file: { name: "synthetic.jpg", mimeType: "image/jpeg", buffer },
      },
    });
  async function profile() {
    return (await (await page.request.get("/api/exportar")).json()).profiles[0];
  }
  async function files() {
    const r = await request.post(
      `${backend}/storage/v1/object/list/body-photos`,
      {
        headers: { apikey: "chave-secreta-de-teste" },
        data: { prefix: `${owner}/avatars`, limit: 100, offset: 0 },
      },
    );
    expect(r.ok()).toBe(true);
    return r.json();
  }
  expect((await request.get(`${origin}/api/perfil/avatar`)).status()).toBe(401);
  expect(
    (
      await request.post(`${origin}/api/perfil/avatar`, {
        headers: { origin },
        multipart: {
          file: {
            name: "synthetic.jpg",
            mimeType: "image/jpeg",
            buffer: green,
          },
        },
      })
    ).status(),
  ).toBe(401);
  await login(page, "avatar-api@example.test");
  expect(
    (
      await page.request.post("/api/perfil/avatar", {
        headers: { origin: "https://example.test" },
        multipart: {
          file: {
            name: "synthetic.jpg",
            mimeType: "image/jpeg",
            buffer: green,
          },
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/perfil/avatar", {
        headers: { origin },
        data: { file: "inválido" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/perfil/avatar", {
        headers: { origin },
        multipart: {
          file: {
            name: "fake.png",
            mimeType: "image/png",
            buffer: Buffer.from("não é uma imagem"),
          },
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/perfil/avatar", {
        headers: { origin },
        multipart: {
          file: {
            name: "big.png",
            mimeType: "image/png",
            buffer: Buffer.alloc(4 * 1024 * 1024),
          },
        },
      })
    ).status(),
  ).toBe(413);
  expect((await upload(page, green)).status()).toBe(201);
  const first = await profile();
  expect(first.display_name).toBe("Pessoa sintética");
  expect(first.avatar_key).toBe(`${owner}/avatars/${first.avatar_id}.webp`);
  const response = await page.request.get("/api/perfil/avatar");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers().vary).toContain("Cookie");
  const original = await response.body(),
    metadata = await sharp(original).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBe(320);
  expect(metadata.height).toBe(320);
  expect(metadata.exif).toBeUndefined();
  expect(
    (await page.request.get("/api/perfil/avatar?baixar=1")).headers()[
      "content-disposition"
    ],
  ).toContain("attachment");
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  try {
    await login(other, "avatar-other-api@example.test");
    expect(
      (
        await other.request.get(`/api/perfil/avatar?versao=${first.avatar_id}`)
      ).status(),
    ).toBe(404);
    const otherAuth = {
      authorization: `Bearer ${await token("avatar-other-api@example.test")}`,
      apikey: "sb_publishable_teste",
    };
    expect(
      (
        await request.get(
          `${backend}/storage/v1/object/authenticated/body-photos/${first.avatar_key}`,
          { headers: otherAuth },
        )
      ).status(),
    ).toBe(404);
    expect((await upload(other, blue)).status()).toBe(201);
    const otherBytes = await (
      await other.request.get(`/api/perfil/avatar?versao=${first.avatar_id}`)
    ).body();
    expect(otherBytes.equals(original)).toBe(false);
    await request.get(`${backend}/_test/fail-avatar-reply/${owner}`);
    expect((await upload(page, red)).status()).toBe(201);
    const confirmed = await profile();
    expect(confirmed.avatar_id).not.toBe(first.avatar_id);
    expect((await files()).map((file: { name: string }) => file.name)).toEqual([
      `${confirmed.avatar_id}.webp`,
    ]);
    await request.get(`${backend}/_test/fail-avatar-upload/${owner}`);
    expect((await upload(page, green)).status()).toBe(503);
    expect((await profile()).avatar_id).toBe(confirmed.avatar_id);
    const queued = await (
      await request.get(
        `${backend}/rest/v1/avatar_cleanup?user_id=eq.${owner}`,
        { headers: { apikey: "chave-secreta-de-teste" } },
      )
    ).json();
    const uncertain = queued.find(
      (job: { avatar_id: string }) => job.avatar_id !== confirmed.avatar_id,
    );
    expect(uncertain).toBeDefined();
    expect(
      (
        await request.patch(
          `${backend}/rest/v1/avatar_cleanup?user_id=eq.${owner}&avatar_id=eq.${uncertain.avatar_id}`,
          {
            headers: { apikey: "chave-secreta-de-teste" },
            data: { available_after: "2000-01-01T00:00:00Z" },
          },
        )
      ).ok(),
    ).toBe(true);
    expect((await upload(page, blue)).status()).toBe(201);
    const current = await profile();
    expect(current.avatar_id).not.toBe(confirmed.avatar_id);
    expect((await files()).map((file: { name: string }) => file.name)).toEqual([
      `${current.avatar_id}.webp`,
    ]);
    const deletion = {
      origin,
      "x-diazen-confirmation": "remover-avatar",
      "x-diazen-avatar-id": confirmed.avatar_id,
    };
    expect(
      (
        await page.request.delete("/api/perfil/avatar", { headers: { origin } })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.delete("/api/perfil/avatar", { headers: deletion })
      ).status(),
    ).toBe(409);
    expect((await profile()).avatar_id).toBe(current.avatar_id);
    await request.get(`${backend}/_test/fail-avatar-reply/${owner}`);
    expect(
      (
        await page.request.delete("/api/perfil/avatar", {
          headers: { ...deletion, "x-diazen-avatar-id": current.avatar_id },
        })
      ).status(),
    ).toBe(200);
    expect((await profile()).avatar_id).toBeNull();
    expect((await profile()).display_name).toBe("Pessoa sintética");
    expect((await page.request.get("/api/perfil/avatar")).status()).toBe(404);
    expect(await files()).toEqual([]);
    expect((await other.request.get("/api/perfil/avatar")).status()).toBe(200);
    expect(
      (
        await page.request.get(`${backend}/rest/v1/avatar_cleanup`, {
          headers: auth,
        })
      ).ok(),
    ).toBe(false);
  } finally {
    await otherContext.close();
  }
  expect(errors).toEqual([]);
});
