export class DependencyGraph {
  constructor() {
    this.nodes = new Set();
    this.dependencies = new Map();
    this.dependents = new Map();
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
}