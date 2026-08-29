import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";

test("empty graph has no nodes or edges", () => {
  const g = new DependencyGraph();
  assert.deepEqual(g.getNodes(), []);
  assert.equal(g.getNodeCount(), 0);
  assert.equal(g.getEdgeCount(), 0);
});

test("single dependency creates two nodes and one edge", () => {
  const g = new DependencyGraph();
  g.addDependency("server.js", "db.js");

  assert.equal(g.hasNode("server.js"), true);
  assert.equal(g.hasNode("db.js"), true);
  assert.equal(g.getNodeCount(), 2);
  assert.equal(g.getEdgeCount(), 1);
  assert.deepEqual(g.getDependencies("server.js"), ["db.js"]);
  assert.deepEqual(g.getDependents("db.js"), ["server.js"]);
});

test("multiple dependencies from one file", () => {
  const g = new DependencyGraph();
  g.addDependency("app.js", "auth.js");
  g.addDependency("app.js", "db.js");
  g.addDependency("app.js", "logger.js");

  assert.equal(g.getNodeCount(), 4);
  assert.equal(g.getEdgeCount(), 3);
  assert.deepEqual(
    g.getDependencies("app.js").sort(),
    ["auth.js", "db.js", "logger.js"]
  );
});

test("duplicate dependencies are ignored", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("a.js", "b.js");
  g.addDependency("a.js", "b.js");

  assert.equal(g.getEdgeCount(), 1);
  assert.deepEqual(g.getDependencies("a.js"), ["b.js"]);
  assert.deepEqual(g.getDependents("b.js"), ["a.js"]);
});

test("disconnected node exists but has no edges", () => {
  const g = new DependencyGraph();
  g.addNode("lonely.js");
  g.addDependency("a.js", "b.js");

  assert.equal(g.hasNode("lonely.js"), true);
  assert.equal(g.getNodeCount(), 3);
  assert.deepEqual(g.getDependencies("lonely.js"), []);
  assert.deepEqual(g.getDependents("lonely.js"), []);
});

test("getDependencies returns empty for unknown file", () => {
  const g = new DependencyGraph();
  assert.deepEqual(g.getDependencies("nope.js"), []);
});

test("getDependents returns empty for unknown file", () => {
  const g = new DependencyGraph();
  assert.deepEqual(g.getDependents("nope.js"), []);
});

test("fromEntries builds graph from parser output format", () => {
  const entries = [
    { source: "src/server.js", dependencies: ["src/auth.js", "src/db.js"] },
    { source: "src/auth.js", dependencies: ["src/db.js"] },
  ];
  const g = DependencyGraph.fromEntries(entries);

  assert.equal(g.getNodeCount(), 3);
  assert.equal(g.getEdgeCount(), 3);
  assert.deepEqual(
    g.getDependencies("src/server.js").sort(),
    ["src/auth.js", "src/db.js"]
  );
  assert.deepEqual(
    g.getDependents("src/db.js").sort(),
    ["src/auth.js", "src/server.js"]
  );
});

test("fromEntries with empty array produces empty graph", () => {
  const g = DependencyGraph.fromEntries([]);
  assert.equal(g.getNodeCount(), 0);
  assert.equal(g.getEdgeCount(), 0);
});

test("toJSON returns serializable structure", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");

  const json = g.toJSON();
  assert.deepEqual(json["a.js"].dependencies, ["b.js"]);
  assert.deepEqual(json["a.js"].dependents, []);
  assert.deepEqual(json["b.js"].dependencies, []);
  assert.deepEqual(json["b.js"].dependents, ["a.js"]);
  assert.doesNotThrow(() => JSON.stringify(json));
});