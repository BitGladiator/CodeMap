import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";
import { hasCycle } from "../../src/graph/cycles.js";

test("detects a circular dependency", () => {
  const graph = new DependencyGraph();

  graph.addDependency("A.js", "B.js");
  graph.addDependency("B.js", "C.js");
  graph.addDependency("C.js", "A.js");

  assert.equal(hasCycle(graph), true);
});

test("returns false when there is no cycle", () => {
  const graph = new DependencyGraph();

  graph.addDependency("A.js", "B.js");
  graph.addDependency("B.js", "C.js");

  assert.equal(hasCycle(graph), false);
});

test("handles an isolated node", () => {
  const graph = new DependencyGraph();

  graph.addNode("A.js");

  assert.equal(hasCycle(graph), false);
});