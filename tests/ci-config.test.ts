import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("GitHub Actions CI runs the public verification commands", () => {
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /22\.x/);
  assert.match(workflow, /24\.x/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run demo:tax/);
  assert.match(workflow, /npm run example:tax/);
  assert.match(workflow, /npm run raw:tax/);
  assert.match(workflow, /npm run demo:select/);
  assert.match(workflow, /npm run pack:check/);
});
