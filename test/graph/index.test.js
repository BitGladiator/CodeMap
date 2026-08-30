import test from "node:test";
import assert from "node:assert/strict";

import { analyze } from "../../src/graph/index.js";

test("analyze() produces complete AnalysisResult from parser output", () => {
  const entries = [
    { source: "src/server.js", dependencies: ["src/auth.js", "src/db.js"] },
    { source: "src/auth.js", dependencies: ["src/db.js"] },
    { source: "src/routes.js", dependencies: ["src/auth.js"] },
  ];

  const result = analyze(entries);

  assert.equal(result.nodeCount, 4);
  assert.equal(result.edgeCount, 4);

  assert.equal(result.hasCycles, false);
  assert.deepEqual(result.cycles, []);

  assert.ok(result.hotspots.length >= 2);
  assert.equal(result.hotspots[0].dependents, 2);
  assert.equal(result.hotspots[1].dependents, 2);

  assert.deepEqual(
    result.files["src/server.js"].dependencies.sort(),
    ["src/auth.js", "src/db.js"]
  );
  assert.equal(result.files["src/db.js"].inDegree, 2);
  assert.equal(result.files["src/db.js"].outDegree, 0);

  assert.equal(result.files["src/server.js"].depth, 2);

  assert.doesNotThrow(() => JSON.stringify(result));
});

test("analyze() on empty input returns zeroed result", () => {
  const result = analyze([]);
  assert.equal(result.nodeCount, 0);
  assert.equal(result.edgeCount, 0);
  assert.equal(result.hasCycles, false);
  assert.deepEqual(result.cycles, []);
  assert.deepEqual(result.hotspots, []);
  assert.deepEqual(result.files, {});
});

test("analyze() detects cycles in parser output", () => {
  const entries = [
    { source: "a.js", dependencies: ["b.js"] },
    { source: "b.js", dependencies: ["a.js"] },
  ];

  const result = analyze(entries);
  assert.equal(result.hasCycles, true);
  assert.ok(result.cycles.length > 0);
});
