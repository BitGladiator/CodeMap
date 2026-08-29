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