export { DependencyGraph } from "./graph.js";
export {
  getNodeCount,
  getEdgeCount,
  getOutDegree,
  getInDegree,
  getHotspots,
  getDependencyDepth,
} from "./metrics.js";
export { hasCycle, findCycles } from "./cycles.js";

import { DependencyGraph } from "./graph.js";
import {
  getNodeCount,
  getEdgeCount,
  getOutDegree,
  getInDegree,
  getHotspots,
  getDependencyDepth,
} from "./metrics.js";
import { findCycles } from "./cycles.js";

export function analyze(entries) {
  const graph = DependencyGraph.fromEntries(entries);
  const cycles = findCycles(graph);
  const nodes = graph.getNodes();

  const files = {};
  for (const node of nodes) {
    files[node] = {
      dependencies: graph.getDependencies(node),
      dependents: graph.getDependents(node),
      inDegree: getInDegree(graph, node),
      outDegree: getOutDegree(graph, node),
      depth: getDependencyDepth(graph, node),
    };
  }

  return {
    nodeCount: getNodeCount(graph),
    edgeCount: getEdgeCount(graph),
    hasCycles: cycles.length > 0,
    cycles,
    hotspots: getHotspots(graph),
    files,
  };
}
