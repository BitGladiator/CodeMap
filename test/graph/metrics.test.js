import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";

import {
  getNodeCount,
  getEdgeCount,
  getOutDegree,
  getInDegree,
} from "../../src/graph/metrics.js";

test("calculates graph metrics", () => {
  const graph = new DependencyGraph();

  graph.addDependency("server.js", "database.js");
  graph.addDependency("api.js", "database.js");

  assert.equal(getNodeCount(graph), 3);
  assert.equal(getEdgeCount(graph), 2);

  assert.equal(getOutDegree(graph, "server.js"), 1);
  assert.equal(getOutDegree(graph, "database.js"), 0);

  assert.equal(getInDegree(graph, "database.js"), 2);
  assert.equal(getInDegree(graph, "server.js"), 0);
});