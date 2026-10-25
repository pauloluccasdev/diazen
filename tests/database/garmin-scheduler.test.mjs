import { test } from "node:test";
import assert from "node:assert/strict";
import { garminScheduleSql } from "../../scripts/configure_garmin_sync.mjs";
test("agendamento usa Vault, destino HTTPS fixo, privilégio mínimo e começa desativado", () => {
  const secret = "synthetic-not-a-real-secret-1234567890";
  const sql = garminScheduleSql("https://example.test", secret);
  const command = sql.slice(sql.indexOf("select cron.schedule"));
  assert.ok(command.includes("vault.decrypted_secrets"));
  assert.ok(!command.includes(secret));
  assert.ok(command.includes("active := false"));
  assert.ok(
    sql.includes(
      "revoke all on schema net,cron from public,anon,authenticated",
    ),
  );
  for (const url of [
    "http://example.test",
    "https://user:pass@example.test",
    "https://example.test/other",
    "https://example.test/#secret",
  ]) {
    assert.throws(() => garminScheduleSql(url, secret));
  }
  assert.throws(() =>
    garminScheduleSql("https://example.test", "x$setup$".repeat(10)),
  );
  assert.ok(
    garminScheduleSql("https://example.test", secret, true).includes(
      "active := true",
    ),
  );
});

test("agendador protegido guarda bypass no Vault e não no comando cron", () => {
  const secret = "synthetic-not-a-real-secret-1234567890";
  const bypass = "0123456789abcdef0123456789abcdef";
  const sql = garminScheduleSql("https://example.test", secret, true, bypass);
  const command = sql.slice(sql.indexOf("select cron.schedule"));
  assert.ok(command.includes("x-vercel-protection-bypass"));
  assert.ok(command.includes("diazen_garmin_vercel_bypass"));
  assert.ok(!command.includes(bypass));
  assert.ok(!command.includes(secret));
  assert.throws(() =>
    garminScheduleSql("https://example.test", secret, true, "invalid"),
  );
});
