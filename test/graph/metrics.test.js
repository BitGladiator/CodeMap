import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";
import {
  getNodeCount,
  getEdgeCount,
  getOutDegree,
  getInDegree,
  getHotspots,
  getDependencyDepth,
} from "../../src/graph/metrics.js";

test("metrics on empty graph are all zero", () => {
  const g = new DependencyGraph();
  assert.equal(getNodeCount(g), 0);
  assert.equal(getEdgeCount(g), 0);
  assert.deepEqual(getHotspots(g), []);
});

test("incoming and outgoing counts", () => {
  const g = new DependencyGraph();
  g.addDependency("server.js", "db.js");
  g.addDependency("api.js", "db.js");
  g.addDependency("server.js", "auth.js");

  assert.equal(getOutDegree(g, "server.js"), 2);
  assert.equal(getOutDegree(g, "api.js"), 1);
  assert.equal(getOutDegree(g, "db.js"), 0);

  assert.equal(getInDegree(g, "db.js"), 2);
  assert.equal(getInDegree(g, "server.js"), 0);
  assert.equal(getInDegree(g, "auth.js"), 1);
});

test("hotspots returns files sorted by dependent count", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "utils.js");
  g.addDependency("b.js", "utils.js");
  g.addDependency("c.js", "utils.js");
  g.addDependency("a.js", "config.js");

  const hotspots = getHotspots(g);
  assert.equal(hotspots[0].file, "utils.js");
  assert.equal(hotspots[0].dependents, 3);
  assert.equal(hotspots[1].file, "config.js");
  assert.equal(hotspots[1].dependents, 1);
});

test("hotspots with threshold filters low-degree files", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "utils.js");
  g.addDependency("b.js", "utils.js");
  g.addDependency("c.js", "utils.js");
  g.addDependency("a.js", "config.js");

  const hotspots = getHotspots(g, 2);
  assert.equal(hotspots.length, 1);
  assert.equal(hotspots[0].file, "utils.js");
});

test("depth on linear chain A→B→C→D", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "c.js");
  g.addDependency("c.js", "d.js");

  assert.equal(getDependencyDepth(g, "a.js"), 3);
  assert.equal(getDependencyDepth(g, "b.js"), 2);
  assert.equal(getDependencyDepth(g, "c.js"), 1);
  assert.equal(getDependencyDepth(g, "d.js"), 0);
});

test("depth picks the longest branch", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("a.js", "c.js");
  g.addDependency("b.js", "d.js");

  assert.equal(getDependencyDepth(g, "a.js"), 2);
});

test("depth is cycle-safe (does not hang or throw)", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "c.js");
  g.addDependency("c.js", "a.js");

  const depth = getDependencyDepth(g, "a.js");
  assert.equal(typeof depth, "number");
  assert.ok(depth >= 0 && depth < Infinity);
});

test("depth of disconnected node is 0", () => {
  const g = new DependencyGraph();
  g.addNode("lonely.js");
  assert.equal(getDependencyDepth(g, "lonely.js"), 0);
});

test("depth with self-cycle does not hang", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "a.js");

  const depth = getDependencyDepth(g, "a.js");
  assert.equal(typeof depth, "number");
  assert.ok(depth >= 0);
});