function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

//-------------------------------

function getGraphNodes(files = {}) {
  const nodes = new Set();

  for (const [file, details] of Object.entries(files)) {
    nodes.add(file);

    for (const dependency of details.dependencies || []) {
      nodes.add(dependency);
    }
  }

  return [...nodes];
}

function calculateNodePositions(nodes, width = 900, height = 500) {
  const positions = {};

  if (nodes.length === 0) {
    return positions;
  }

  const centerX = width / 2;
  const centerY = height / 2;

  const radius = Math.min(width, height) / 2 - 90;

  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;

    positions[node] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return positions;
}

function generateDependencyGraph(files = {}) {
  const nodes = getGraphNodes(files);

  if (nodes.length === 0) {
    return `<p class="empty">No dependency graph data available.</p>`;
  }

  const width = 900;
  const height = 500;

  const positions = calculateNodePositions(nodes, width, height);

  const edges = [];

  for (const [file, details] of Object.entries(files)) {
    for (const dependency of details.dependencies || []) {
      const source = positions[file];
      const target = positions[dependency];

      if (!source || !target) {
        continue;
      }

      const nodeRadius = 34;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        continue;
      }

      const unitX = dx / distance;
      const unitY = dy / distance;

      const startX = source.x + unitX * nodeRadius;
      const startY = source.y + unitY * nodeRadius;

      const endX = target.x - unitX * nodeRadius;
      const endY = target.y - unitY * nodeRadius;

      edges.push(`
  <line
    x1="${startX}"
    y1="${startY}"
    x2="${endX}"
    y2="${endY}"
    class="graph-edge"
    marker-end="url(#arrow)"
  />
`);
    }
  }

  const nodeElements = nodes
    .map((file) => {
      const position = positions[file];

      const fileDetails = files[file] || {};

      const inDegree = fileDetails.inDegree || 0;
      const outDegree = fileDetails.outDegree || 0;

      const isHotspot = inDegree >= 3;

      const shortName = file.split("/").pop();

      return `
        <g class="graph-node">
            <circle
      cx="${position.x}"
      cy="${position.y}"
      r="34"
      class="${isHotspot ? "node-circle hotspot-node" : "node-circle"}"
    >
      <title>${escapeHtml(file)}
Incoming dependencies: ${inDegree}
Outgoing dependencies: ${outDegree}</title>
    </circle>

          <text
            x="${position.x}"
            y="${position.y}"
            class="node-label"
          >
            ${escapeHtml(shortName)}
          </text>
        </g>
      `;
    })
    .join("");

  return `
    <div class="graph-container">
      <svg
        class="dependency-graph"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Repository dependency graph"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              class="arrow-head"
            />
          </marker>
        </defs>

        ${edges.join("")}

        ${nodeElements}
      </svg>
    </div>
  `;
}

//------------------------------------------------------

function formatHtmlOutput(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid analysis data.");
  }

  const graph = data.graph || {};
  const git = data.git || {};
  const dependencyGraph = generateDependencyGraph(graph.files || {});
  const hotspots = graph.hotspots || [];
  const mostChangedFiles = git.mostChangedFiles || [];
  const highImpactFiles = data.highImpactFiles || [];
  const cycles = graph.cycles || [];

  const hotspotRows = hotspots.length
    ? hotspots
        .slice(0, 5)
        .map(
          (hotspot) => `
            <tr>
              <td>${escapeHtml(hotspot.file)}</td>
              <td>${hotspot.dependents}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="2" class="empty">No hotspots found.</td>
        </tr>
      `;

  const changedFileRows = mostChangedFiles.length
    ? mostChangedFiles
        .slice(0, 5)
        .map(
          (file) => `
            <tr>
              <td>${escapeHtml(file.file)}</td>
              <td>${file.changes}</td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="2" class="empty">No recent file changes found.</td>
        </tr>
      `;

  const highImpactCards = highImpactFiles.length
    ? highImpactFiles
        .map(
          (file) => `
            <article class="impact-card">
              <h3>${escapeHtml(file.file)}</h3>

              <div class="impact-stats">
                <span>${file.recentChanges} recent changes</span>
                <span>${file.currentDependents} dependents</span>
              </div>

              <p>${escapeHtml(file.note)}</p>
            </article>
          `,
        )
        .join("")
    : `<p class="empty">No high-impact files detected.</p>`;

  const cycleItems =
    graph.hasCycles && cycles.length
      ? cycles
          .map((cycle) => `<li>${cycle.map(escapeHtml).join(" &rarr; ")}</li>`)
          .join("")
      : `<li class="empty">No circular dependencies found.</li>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CodeMap Report</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f6f7fb;
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }

    .container {
      width: min(1100px, 92%);
      margin: 0 auto;
      padding: 48px 0;
    }

    header {
      margin-bottom: 32px;
    }

    header h1 {
      margin: 0;
      font-size: 32px;
    }

    header p {
      margin-top: 6px;
      color: #6b7280;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card,
    .panel,
    .impact-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
    }

    .summary-card {
      padding: 20px;
    }

    .summary-card span {
      display: block;
      color: #6b7280;
      font-size: 14px;
    }

    .summary-card strong {
      display: block;
      margin-top: 6px;
      font-size: 28px;
    }

    .panel {
      padding: 24px;
      margin-bottom: 24px;
    }

    .panel h2 {
      margin-top: 0;
      font-size: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      color: #6b7280;
      font-size: 13px;
      text-transform: uppercase;
    }

    .git-summary {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .git-summary div {
      display: flex;
      flex-direction: column;
    }

    .git-summary span {
      color: #6b7280;
      font-size: 13px;
    }

    .git-summary strong {
      font-size: 18px;
    }

    .impact-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .impact-card {
      padding: 18px;
    }

    .impact-card h3 {
      margin-top: 0;
      margin-bottom: 12px;
    }

    .impact-card p {
      margin-bottom: 0;
      color: #4b5563;
    }

    .impact-stats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .impact-stats span {
      background: #f3f4f6;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 13px;
    }

    .cycles {
      padding-left: 20px;
    }

    .empty {
      color: #6b7280;
      font-style: italic;
    }

    footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      margin-top: 32px;
    }

    .section-description {
  margin-top: -8px;
  margin-bottom: 20px;
  color: #6b7280;
  font-size: 14px;
}

.graph-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
}

.dependency-graph {
  display: block;
  width: 100%;
  min-width: 700px;
  height: auto;
}

.graph-edge {
  stroke: #9ca3af;
  stroke-width: 1.5;
}

.arrow-head {
  fill: #9ca3af;
}

.node-circle {
  fill: #ffffff;
  stroke: #64748b;
  stroke-width: 2;
}

.hotspot-node {
  fill: #fef2f2;
  stroke: #dc2626;
  stroke-width: 3;
}

.node-label {
  fill: #1f2937;
  font-size: 12px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.graph-node {
  cursor: default;
}

.graph-legend {
  display: flex;
  gap: 20px;
  margin-top: 14px;
  color: #6b7280;
  font-size: 13px;
}

.graph-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: 2px solid #64748b;
}

.hotspot-legend {
  background: #fef2f2;
  border-color: #dc2626;
}

    @media (max-width: 700px) {
      .summary,
      .impact-grid {
        grid-template-columns: 1fr;
      }

      .container {
        padding: 24px 0;
      }
    }
  </style>
</head>

<body>
  <main class="container">

    <header>
      <h1>CodeMap</h1>
      <p>Repository Architecture & Change Analysis</p>
    </header>

    <section class="summary">
      <div class="summary-card">
        <span>Files</span>
        <strong>${graph.nodeCount ?? 0}</strong>
      </div>

      <div class="summary-card">
        <span>Dependencies</span>
        <strong>${graph.edgeCount ?? 0}</strong>
      </div>

      <div class="summary-card">
        <span>Circular Dependencies</span>
        <strong>${graph.hasCycles ? cycles.length : 0}</strong>
      </div>
    </section>

    <section class="panel">
  <h2>Dependency Graph</h2>

  <p class="section-description">
    Arrows show which files depend on other files.
  </p>

  ${dependencyGraph}

  <div class="graph-legend">
    <span>
      <span class="legend-dot"></span>
      File
    </span>

    <span>
      <span class="legend-dot hotspot-legend"></span>
      Hotspot
    </span>
  </div>
</section>

    <section class="panel">
      <h2>Hotspots</h2>

      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Dependents</th>
          </tr>
        </thead>

        <tbody>
          ${hotspotRows}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Recent Changes</h2>

      <div class="git-summary">
        <div>
          <span>Commits</span>
          <strong>${git.commitCount ?? 0}</strong>
        </div>

        <div>
          <span>Files Changed</span>
          <strong>${git.filesChanged ?? 0}</strong>
        </div>

        <div>
          <span>Added</span>
          <strong>${git.added ?? 0}</strong>
        </div>

        <div>
          <span>Modified</span>
          <strong>${git.modified ?? 0}</strong>
        </div>

        <div>
          <span>Deleted</span>
          <strong>${git.deleted ?? 0}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Most Changed File</th>
            <th>Changes</th>
          </tr>
        </thead>

        <tbody>
          ${changedFileRows}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>High Impact Files</h2>

      <div class="impact-grid">
        ${highImpactCards}
      </div>
    </section>

    <section class="panel">
      <h2>Circular Dependencies</h2>

      <ul class="cycles">
        ${cycleItems}
      </ul>
    </section>

    <footer>
      Generated by CodeMap
    </footer>

  </main>
</body>
</html>`;
}

module.exports = {
  formatHtmlOutput,
};
