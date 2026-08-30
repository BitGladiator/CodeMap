import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { analyze } from "../../src/graph/index.js";

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/parser-output.json", import.meta.url), "utf-8")
);

test("integration: analyze demo-project fixture", () => {
  const result = analyze(fixture);

  assert.equal(result.nodeCount, 9);
  assert.equal(result.edgeCount, 16);
  assert.equal(result.hasCycles, false);
  assert.deepEqual(result.cycles, []);

  assert.equal(result.hotspots[0].file, "src/database.js");
  assert.equal(result.hotspots[0].dependents, 5);

  assert.equal(result.files["src/config.js"].inDegree, 3);
  assert.equal(result.files["src/config.js"].outDegree, 0);

  assert.equal(result.files["src/server.js"].outDegree, 5);
  assert.ok(result.files["src/server.js"].depth >= 3);

  assert.equal(result.files["src/utils.js"].depth, 0);

  assert.doesNotThrow(() => JSON.stringify(result));
});
