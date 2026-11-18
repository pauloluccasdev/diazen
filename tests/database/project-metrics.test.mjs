import test from "node:test";
import assert from "node:assert/strict";
import {
  projectCounts,
  projectTiming,
  projectWeightReference,
} from "../../src/lib/project-metrics.ts";

test("contagens distinguem ACTIVE e planejados sem limitar à página", () => {
  const projects = Array.from({ length: 1005 }, () => ({ status: "DRAFT" }));
  projects.push(
    { status: "ACTIVE" },
    { status: "COMPLETED" },
    { status: "ARCHIVED" },
  );
  assert.deepEqual(projectCounts(projects), {
    ACTIVE: 1,
    DRAFT: 1005,
    COMPLETED: 1,
    ARCHIVED: 1,
  });
});

test("tempo é calendário inclusivo, limitado ao prazo, sem inferir aderência", () => {
  const project = {
    starts_on: "2026-11-10",
    ends_on: "2026-12-31",
    closed_at: null,
  };
  assert.deepEqual(projectTiming(project, "2026-11-09"), {
    elapsed: 0,
    total: 52,
    percent: 0,
    remaining: 52,
  });
  assert.equal(projectTiming(project, "2026-11-10").elapsed, 1);
  assert.equal(projectTiming(project, "2027-01-10").percent, 100);
  assert.equal(projectTiming(project, "2027-01-10").remaining, 0);
});

test("encerramento congela calendário na data de São Paulo e prazo pode ser ausente", () => {
  const project = {
    starts_on: "2026-11-10",
    ends_on: null,
    closed_at: "2026-11-19T01:00:00Z",
  };
  assert.deepEqual(projectTiming(project, "2026-12-01"), {
    elapsed: 9,
    total: null,
    percent: null,
    remaining: null,
  });
  assert.equal(projectTiming(project, "2026-11-12").elapsed, 3);
});

test("referência de peso só aparece nos modos alvo/faixa com dados", () => {
  assert.equal(
    projectWeightReference({
      weight_mode: "track",
      weight_min: 80,
      weight_max: null,
    }),
    null,
  );
  assert.equal(
    projectWeightReference({
      weight_mode: "target",
      weight_min: null,
      weight_max: null,
    }),
    null,
  );
  assert.deepEqual(
    projectWeightReference({
      weight_mode: "target",
      weight_min: "88.0",
      weight_max: null,
    }),
    { min: 88, max: null },
  );
  assert.deepEqual(
    projectWeightReference({
      weight_mode: "range",
      weight_min: 80,
      weight_max: 85,
    }),
    { min: 80, max: 85 },
  );
});
