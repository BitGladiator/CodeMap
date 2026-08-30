export function hasCycle(graph) {
  const visiting = new Set();
  const visited = new Set();

  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);

    for (const dep of graph.getDependencies(node)) {
      if (visit(dep)) return true;
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of graph.getNodes()) {
    if (visit(node)) return true;
  }

  return false;
}

export function findCycles(graph) {
  const cycles = [];
  const visited = new Set();

  for (const node of graph.getNodes()) {
    if (graph.getDependencies(node).includes(node)) {
      cycles.push([node, node]);
    }
  }

  const path = [];
  const onPath = new Set();

  function dfs(node) {
    if (visited.has(node)) return;

    onPath.add(node);
    path.push(node);

    for (const dep of graph.getDependencies(node)) {
      if (dep === node) continue;
      if (onPath.has(dep)) {
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycle.push(dep);
        cycles.push(cycle);
      } else if (!visited.has(dep)) {
        dfs(dep);
      }
    }

    path.pop();
    onPath.delete(node);
    visited.add(node);
  }

  for (const node of graph.getNodes()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}