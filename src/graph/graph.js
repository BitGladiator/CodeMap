export class DependencyGraph {
  constructor() {
    this.nodes = new Set();
    this.dependencies = new Map();
    this.dependents = new Map();
  }

  static fromEntries(entries) {
    const graph = new DependencyGraph();
    for (const entry of entries) {
      graph.addNode(entry.source);
      for (const dep of entry.dependencies) {
        graph.addDependency(entry.source, dep);
      }
    }
    return graph;
  }

  addNode(file) {
    this.nodes.add(file);

    if (!this.dependencies.has(file)) {
      this.dependencies.set(file, new Set());
    }

    if (!this.dependents.has(file)) {
      this.dependents.set(file, new Set());
    }
  }

  addDependency(source, target) {
    this.addNode(source);
    this.addNode(target);

    this.dependencies.get(source).add(target);
    this.dependents.get(target).add(source);
  }

  getDependencies(file) {
    return [...(this.dependencies.get(file) || [])];
  }

  getDependents(file) {
    return [...(this.dependents.get(file) || [])];
  }

  hasNode(file) {
    return this.nodes.has(file);
  }

  getNodes() {
    return [...this.nodes];
  }

  getNodeCount() {
    return this.nodes.size;
  }

  getEdgeCount() {
    let count = 0;
    for (const deps of this.dependencies.values()) {
      count += deps.size;
    }
    return count;
  }

  toJSON() {
    const result = {};
    for (const node of this.getNodes()) {
      result[node] = {
        dependencies: this.getDependencies(node),
        dependents: this.getDependents(node),
      };
    }
    return result;
  }
}