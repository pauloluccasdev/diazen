import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProfileName,
  legacyProfileName,
  profileIdentity,
  profileInitials,
} from "../../src/lib/profile-values.ts";

test("nome de exibição é opcional, limitado por caracteres e sem controles", () => {
  for (const value of [null, undefined, "", "   "])
    assert.deepEqual(normalizeProfileName(value), { value: null, error: "" });
  assert.equal(normalizeProfileName("  Maria Silva  ").value, "Maria Silva");
  assert.equal(normalizeProfileName("😀".repeat(80)).error, "");
  for (const invalid of ["x".repeat(81), "A\nB", "A\u0000B", 3, {}])
    assert.ok(normalizeProfileName(invalid).error);
});

test("identidade não adivinha nome e preserva remoção explícita", () => {
  assert.deepEqual(profileIdentity(null), { name: null, avatarId: null });
  assert.equal(
    profileIdentity(null, "Nome confirmado").name,
    "Nome confirmado",
  );
  assert.equal(legacyProfileName({ name: "Objeto" }), null);
  assert.equal(legacyProfileName("x".repeat(100)).length, 80);
  assert.deepEqual(
    profileIdentity({ display_name: null, avatar_id: "id" }, "Nome antigo"),
    { name: null, avatarId: "id" },
  );
});

test("iniciais usam somente o nome confirmado e respeitam Unicode", () => {
  assert.equal(profileInitials(null), "");
  assert.equal(profileInitials("Maria da Silva"), "MS");
  assert.equal(profileInitials("Paulo"), "PA");
  assert.equal(profileInitials("😀"), "😀");
  assert.equal(profileInitials("  João  Ávila  "), "JÁ");
});
