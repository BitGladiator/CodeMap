export function hasCycle(graph) {
  const visiting = new Set();
  const visited = new Set();

  function visit(node) {
    if (visiting.has(node)) {
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);

    for (const dependency of graph.getDependencies(node)) {
      if (visit(dependency)) {
        return true;
      }
    }

    visiting.delete(node);
    visited.add(node);

    return false;
  }

  for (const node of graph.getNodes()) {
    if (visit(node)) {
      return true;
    }
  }

  return false;
}