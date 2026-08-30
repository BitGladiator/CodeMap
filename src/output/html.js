function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function calculateTieredLayout(displayNodes, files = {}) {
  const positions = {};
  const total = displayNodes.length;
  if (total === 0) return { positions, width: 800, height: 500 };

  const hotspots = [];
  const intermediates = [];
  const leaves = [];

  for (const file of displayNodes) {
    const inDeg = files[file]?.inDegree || 0;
    const outDeg = files[file]?.outDegree || 0;
    if (inDeg >= 3 || (inDeg >= 2 && outDeg >= 2)) {
      hotspots.push(file);
    } else if (inDeg >= 1 && outDeg >= 1) {
      intermediates.push(file);
    } else {
      leaves.push(file);
    }
  }

  if (total <= 12) {
    const r = Math.max(140, total * 24);
    const size = (r + 80) * 2;
    const cx = size / 2;
    const cy = size / 2;
    displayNodes.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
      const isHotspot = (files[node]?.inDegree || 0) >= 3;
      positions[node] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        r: isHotspot ? 24 : 18,
        isHotspot
      };
    });
    return { positions, width: size, height: size };
  }

  const r1 = Math.max(90, hotspots.length * 28);
  const r2 = r1 + Math.max(120, intermediates.length * 16);
  const r3 = r2 + Math.max(120, leaves.length * 12);
  const size = (r3 + 90) * 2;
  const cx = size / 2;
  const cy = size / 2;

  const placeRing = (ringNodes, radius, offset = 0, baseRadius = 18) => {
    ringNodes.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / ringNodes.length - Math.PI / 2 + offset;
      const isHotspot = (files[node]?.inDegree || 0) >= 3;
      positions[node] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        r: isHotspot ? 24 : baseRadius,
        isHotspot
      };
    });
  };

  if (hotspots.length > 0) placeRing(hotspots, r1, 0, 22);
  if (intermediates.length > 0) placeRing(intermediates, r2, Math.PI / (intermediates.length || 1), 18);
  if (leaves.length > 0) placeRing(leaves, r3, 0, 16);

  return { positions, width: size, height: size };
}

function generateDependencyGraph(files = {}) {
  const allNodes = getGraphNodes(files);

  if (allNodes.length === 0) {
    return `<p class="empty">No dependency graph data available.</p>`;
  }

  const sortedNodes = [...allNodes].sort((a, b) => {
    const da = (files[a]?.inDegree || 0) + (files[a]?.outDegree || 0);
    const db = (files[b]?.inDegree || 0) + (files[b]?.outDegree || 0);
    return db - da;
  });

  const MAX_DISPLAY = 32;
  const displayNodes = sortedNodes.slice(0, MAX_DISPLAY);
  const displaySet = new Set(displayNodes);

  const { positions, width, height } = calculateTieredLayout(displayNodes, files);

  const edges = [];
  for (const file of displayNodes) {
    const src = positions[file];
    if (!src) continue;

    for (const dep of files[file]?.dependencies || []) {
      if (!displaySet.has(dep)) continue;
      const tgt = positions[dep];
      if (!tgt) continue;

      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const ux = dx / dist;
      const uy = dy / dist;

      const x1 = src.x + ux * src.r;
      const y1 = src.y + uy * src.r;
      const x2 = tgt.x - ux * (tgt.r + 4);
      const y2 = tgt.y - uy * (tgt.r + 4);

      edges.push(`
  <line
    x1="${x1.toFixed(1)}"
    y1="${y1.toFixed(1)}"
    x2="${x2.toFixed(1)}"
    y2="${y2.toFixed(1)}"
    class="graph-edge"
    marker-end="url(#arrow)"
  />`);
    }
  }

  const nodeElements = displayNodes.map((file) => {
    const pos = positions[file];
    const details = files[file] || {};
    const inDeg = details.inDegree || 0;
    const outDeg = details.outDegree || 0;
    const shortName = file.split("/").pop();
    const isHotspot = pos.isHotspot;

    return `
      <g class="graph-node">
        <circle
          cx="${pos.x.toFixed(1)}"
          cy="${pos.y.toFixed(1)}"
          r="${pos.r}"
          class="${isHotspot ? "node-circle hotspot-node" : "node-circle"}"
        >
          <title>${escapeHtml(file)}&#10;Incoming Dependents: ${inDeg}&#10;Outgoing Dependencies: ${outDeg}</title>
        </circle>
        <text
          x="${pos.x.toFixed(1)}"
          y="${pos.y.toFixed(1)}"
          class="node-label"
        >${escapeHtml(shortName.length > 13 ? shortName.slice(0, 11) + ".." : shortName)}</text>
      </g>`;
  }).join("");

  const notice = allNodes.length > MAX_DISPLAY
    ? `<div class="graph-notice">Showing top ${MAX_DISPLAY} core files (of ${allNodes.length} total) ranked by architectural importance.</div>`
    : "";

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
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
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
    ${notice}
  `;
}

export function formatHtmlOutput(data) {
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
  stroke: #cbd5e1;
  stroke-width: 1.5;
  transition: stroke 0.2s, stroke-width 0.2s;
}

.arrow-head {
  fill: #94a3b8;
}

.node-circle {
  fill: #ffffff;
  stroke: #64748b;
  stroke-width: 2;
  transition: transform 0.2s, stroke 0.2s, fill 0.2s;
}

.hotspot-node {
  fill: #fef2f2;
  stroke: #dc2626;
  stroke-width: 3;
}

.node-label {
  fill: #0f172a;
  font-size: 11px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 3px;
  stroke-linejoin: round;
}

.graph-node {
  cursor: pointer;
}

.graph-node:hover .node-circle {
  stroke: #4f46e5;
  stroke-width: 3.5;
  filter: drop-shadow(0 0 6px rgba(79, 70, 229, 0.4));
}

.graph-notice {
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
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
