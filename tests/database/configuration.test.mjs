import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSupabaseConfiguration as validate } from "../../src/lib/configuration.ts";
test("configuração pública nunca aceita chave privilegiada", () => {
  assert.equal(
    validate("https://exemplo.supabase.co", "sb_secret_nao-expor"),
    null,
  );
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.teste`;
  assert.equal(validate("https://exemplo.supabase.co", jwt), null);
  assert.equal(
    validate("http://exemplo.supabase.co", "sb_publishable_teste"),
    null,
  );
  assert.equal(
    validate(
      "https://user:password@exemplo.supabase.co",
      "sb_publishable_teste",
    ),
    null,
  );
  assert.ok(validate("http://127.0.0.1:54329", "sb_publishable_teste"));
  assert.ok(validate("https://exemplo.supabase.co", "sb_publishable_teste"));
});
