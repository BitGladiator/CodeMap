import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";

test("creates a dependency graph", () => {
  const graph = new DependencyGraph();

  graph.addDependency("server.js", "database.js");

  assert.equal(graph.hasNode("server.js"), true);
  assert.equal(graph.hasNode("database.js"), true);

  assert.deepEqual(
    graph.getDependencies("server.js"),
    ["database.js"]
  );

  assert.deepEqual(
    graph.getDependents("database.js"),
    ["server.js"]
  );
});