import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestError } from "../../src/instrumentation.ts";

test("falha registra módulo e instante sem copiar erro, URL, credenciais ou dados", () => {
  const entries = [];
  const original = console.error;
  console.error = (entry) => entries.push(JSON.parse(entry));
  try {
    onRequestError(
      new Error("provider-secret-and-health-information"),
      {
        path: "/painel/agua?private=value",
        method: "POST",
        headers: { authorization: "secret-token" },
      },
      {
        routePath: "/painel/[modulo]",
        routeType: "render",
        routerKind: "App Router",
      },
    );
  } finally {
    console.error = original;
  }
  assert.equal(entries.length, 1);
  assert.deepEqual(Object.keys(entries[0]).sort(), [
    "at",
    "event",
    "route",
    "type",
  ]);
  assert.equal(entries[0].event, "request_failed");
  assert.equal(entries[0].route, "/painel/[modulo]");
  assert.ok(Number.isFinite(Date.parse(entries[0].at)));
  assert.doesNotMatch(
    JSON.stringify(entries),
    /secret|health|private|authorization/,
  );
});
