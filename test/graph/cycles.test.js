import test from "node:test";
import assert from "node:assert/strict";

import { DependencyGraph } from "../../src/graph/graph.js";
import { hasCycle, findCycles } from "../../src/graph/cycles.js";

test("no cycle in empty graph", () => {
  const g = new DependencyGraph();
  assert.equal(hasCycle(g), false);
  assert.deepEqual(findCycles(g), []);
});

test("no cycle in linear chain", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "c.js");
  assert.equal(hasCycle(g), false);
  assert.deepEqual(findCycles(g), []);
});

test("no cycle with isolated node", () => {
  const g = new DependencyGraph();
  g.addNode("lonely.js");
  assert.equal(hasCycle(g), false);
  assert.deepEqual(findCycles(g), []);
});

test("detects circular dependency A→B→C→A", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "c.js");
  g.addDependency("c.js", "a.js");

  assert.equal(hasCycle(g), true);

  const cycles = findCycles(g);
  assert.equal(cycles.length, 1);
  const cycle = cycles[0];
  assert.equal(cycle[0], cycle[cycle.length - 1]);
  assert.equal(cycle.length, 4);
});

test("detects self-cycle A→A", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "a.js");

  assert.equal(hasCycle(g), true);

  const cycles = findCycles(g);
  assert.equal(cycles.length, 1);
  assert.deepEqual(cycles[0], ["a.js", "a.js"]);
});

test("detects multiple independent cycles", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "a.js");
  g.addDependency("c.js", "d.js");
  g.addDependency("d.js", "c.js");

  assert.equal(hasCycle(g), true);

  const cycles = findCycles(g);
  assert.equal(cycles.length, 2);

  for (const cycle of cycles) {
    assert.equal(cycle[0], cycle[cycle.length - 1]);
  }
});

test("mixed graph: cycle alongside acyclic nodes", () => {
  const g = new DependencyGraph();
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "a.js");
  g.addDependency("c.js", "d.js");
  g.addNode("lonely.js");

  assert.equal(hasCycle(g), true);

  const cycles = findCycles(g);
  assert.equal(cycles.length, 1);
});

test("self-cycle and regular cycle coexist", () => {
  const g = new DependencyGraph();
  g.addDependency("x.js", "x.js");
  g.addDependency("a.js", "b.js");
  g.addDependency("b.js", "a.js");

  const cycles = findCycles(g);
  assert.equal(cycles.length, 2);
});

test("disconnected files produce no cycles", () => {
  const g = new DependencyGraph();
  g.addNode("a.js");
  g.addNode("b.js");
  g.addNode("c.js");

  assert.equal(hasCycle(g), false);
  assert.deepEqual(findCycles(g), []);
});