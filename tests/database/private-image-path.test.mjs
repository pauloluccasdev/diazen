import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateImageKey } from "../../src/lib/private-image-path.ts";
const owner = "00000000-0000-4000-8000-000000000001",
  project = "00000000-0000-4000-8000-000000000002",
  image = "00000000-0000-4000-8000-000000000003";
test("backup aceita os caminhos antigos e o namespace privado de avatar", () => {
  for (const path of [
    `${owner}/${project}/${image}.webp`,
    `${owner}/${project}/${image}-thumb.webp`,
    `${owner}/avatars/${image}.webp`,
  ])
    assert.equal(isPrivateImageKey(path), true);
});
test("namespace de avatar não admite URLs, travessia ou caminhos codificados", () => {
  for (const path of [
    null,
    "",
    `https://example.test/${owner}/avatars/${image}.webp`,
    `${owner}/avatars/../${image}.webp`,
    `${owner}/avatars/${image}.png`,
    `${owner}/avatars/${image}-thumb.webp`,
    `${owner}%2Favatars%2F${image}.webp`,
    `${owner}/avatars/${image}.webp?public=1`,
  ])
    assert.equal(isPrivateImageKey(path), false);
});
