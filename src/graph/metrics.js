export function getNodeCount(graph) {
  return graph.getNodes().length;
}

export function getEdgeCount(graph) {
  let count = 0;
  for (const node of graph.getNodes()) {
    count += graph.getDependencies(node).length;
  }
  return count;
}

export function getOutDegree(graph, file) {
  return graph.getDependencies(file).length;
}

export function getInDegree(graph, file) {
  return graph.getDependents(file).length;
}

export function getHotspots(graph, threshold = 1) {
  const hotspots = [];
  for (const node of graph.getNodes()) {
    const inDeg = getInDegree(graph, node);
    if (inDeg >= threshold) {
      hotspots.push({ file: node, dependents: inDeg });
    }
  }
  return hotspots.sort((a, b) => b.dependents - a.dependents);
}

export function getDependencyDepth(graph, file) {
  const memo = new Map();
  const computing = new Set();

  function depth(node) {
    if (memo.has(node)) return memo.get(node);
    if (computing.has(node)) return 0;

    computing.add(node);

    let maxDepth = 0;
    for (const dep of graph.getDependencies(node)) {
      maxDepth = Math.max(maxDepth, 1 + depth(dep));
    }

    computing.delete(node);
    memo.set(node, maxDepth);
    return maxDepth;
  }

  return depth(file);
}