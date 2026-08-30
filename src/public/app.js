(function() {
  const form = document.getElementById("analyze-form");
  const urlInput = document.getElementById("repo-url");
  const analyzeBtn = document.getElementById("analyze-btn");
  const errorBox = document.getElementById("error-box");
  const errorMessage = document.getElementById("error-message");
  const loadingSection = document.getElementById("loading-section");
  const resultsSection = document.getElementById("results-section");

  const statFiles = document.getElementById("stat-files");
  const statDeps = document.getElementById("stat-deps");
  const statCycles = document.getElementById("stat-cycles");
  const statCommits = document.getElementById("stat-commits");
  const statChanged = document.getElementById("stat-changed");
  const cardCycles = document.getElementById("card-cycles");

  const resultRepoName = document.getElementById("result-repo-name");
  const resultRepoLink = document.getElementById("result-repo-link");
  const graphViewport = document.getElementById("graph-viewport");
  const hotspotsTbody = document.getElementById("hotspots-tbody");
  const highImpactContainer = document.getElementById("high-impact-container");
  const gitAdd = document.getElementById("git-add");
  const gitMod = document.getElementById("git-mod");
  const gitDel = document.getElementById("git-del");
  const changedFilesTbody = document.getElementById("changed-files-tbody");
  const cyclesContainer = document.getElementById("cycles-container");

  const downloadHtmlBtn = document.getElementById("download-html-btn");
  const toggleJsonBtn = document.getElementById("toggle-json-btn");
  const jsonViewerSection = document.getElementById("json-viewer-section");
  const jsonCode = document.getElementById("json-code");

  const filterBtns = document.querySelectorAll(".btn-filter");
  const graphSearchInput = document.getElementById("graph-search");
  const graphCountBadge = document.getElementById("graph-count-badge");

  const hud = document.getElementById("node-inspector-hud");
  const hudFilename = document.getElementById("hud-filename");
  const hudInCount = document.getElementById("hud-in-count");
  const hudOutCount = document.getElementById("hud-out-count");
  const hudHotspotBadge = document.getElementById("hud-hotspot-badge");

  let currentAnalysisData = null;
  let currentFilterMode = "core";
  let currentSearchQuery = "";

  document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const urlType = btn.dataset.url;
      if (urlType === "local:fixture") {
        urlInput.value = "local:demo-project";
      } else if (urlType === "local:codemap") {
        urlInput.value = "local:codemap";
      } else {
        urlInput.value = urlType;
      }
      form.dispatchEvent(new Event("submit"));
    });
  });

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFilterMode = btn.dataset.mode;
      if (currentAnalysisData?.graph?.files) {
        renderDependencyGraph(currentAnalysisData.graph.files);
      }
    });
  });

  graphSearchInput.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    if (currentAnalysisData?.graph?.files) {
      renderDependencyGraph(currentAnalysisData.graph.files);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    hideError();
    hideResults();
    showLoading();

    try {
      const payload = { url };
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Analysis failed. Please check the repository URL.");
      }

      currentAnalysisData = result.data;
      renderResults(result.data);
    } catch (err) {
      showError(err.message);
    } finally {
      hideLoading();
    }
  });

  toggleJsonBtn.addEventListener("click", () => {
    if (!currentAnalysisData) return;
    const isHidden = jsonViewerSection.style.display === "none";
    jsonViewerSection.style.display = isHidden ? "block" : "none";
    toggleJsonBtn.textContent = isHidden ? "Hide JSON" : "View JSON";
  });

  downloadHtmlBtn.addEventListener("click", () => {
    if (!currentAnalysisData || !currentAnalysisData.htmlReport) return;
    const blob = new Blob([currentAnalysisData.htmlReport], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (currentAnalysisData.repository || "codemap-report").replace(/[/\\?%*:|"<>]/g, "-");
    a.download = `${safeName}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderResults(data) {
    const graph = data.graph || {};
    const git = data.git || {};
    const highImpact = data.highImpactFiles || [];
    const cycles = graph.cycles || [];
    const hotspots = graph.hotspots || [];
    const files = graph.files || {};

    resultRepoName.textContent = data.repository || "CodeMap Analysis";
    if (data.url && data.url.startsWith("http")) {
      resultRepoLink.href = data.url;
      resultRepoLink.style.display = "inline";
    } else {
      resultRepoLink.style.display = "none";
    }

    statFiles.textContent = graph.nodeCount ?? 0;
    statDeps.textContent = graph.edgeCount ?? 0;
    statCycles.textContent = graph.hasCycles ? cycles.length : 0;
    statCommits.textContent = git.commitCount ?? 0;
    statChanged.textContent = git.filesChanged ?? 0;

    if (graph.hasCycles && cycles.length > 0) {
      cardCycles.classList.add("has-danger");
    } else {
      cardCycles.classList.remove("has-danger");
    }

    renderDependencyGraph(files);

    if (hotspots.length === 0) {
      hotspotsTbody.innerHTML = '<tr><td colspan="3" class="text-muted-cell">No architectural hotspots found.</td></tr>';
    } else {
      hotspotsTbody.innerHTML = hotspots.slice(0, 10).map(h => {
        const outCount = files[h.file]?.outDegree ?? files[h.file]?.dependencies?.length ?? 0;
        return `
          <tr>
            <td class="code-font">${escapeHtml(h.file)}</td>
            <td class="text-right"><strong>${h.dependents}</strong></td>
            <td class="text-right">${outCount}</td>
          </tr>
        `;
      }).join("");
    }

    if (highImpact.length === 0) {
      highImpactContainer.innerHTML = '<p class="text-muted-cell" style="padding: 12px;">No high-impact files detected.</p>';
    } else {
      highImpactContainer.innerHTML = `
        <table class="data-grid-table">
          <thead>
            <tr>
              <th>File</th>
              <th class="text-right">Recent Changes</th>
              <th class="text-right">Dependents</th>
              <th>Impact Assessment</th>
            </tr>
          </thead>
          <tbody>
            ${highImpact.slice(0, 8).map(f => `
              <tr>
                <td class="code-font">${escapeHtml(f.file)}</td>
                <td class="text-right">${f.recentChanges}</td>
                <td class="text-right">${f.currentDependents}</td>
                <td>${escapeHtml(f.note)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    gitAdd.textContent = git.added ?? 0;
    gitMod.textContent = git.modified ?? 0;
    gitDel.textContent = git.deleted ?? 0;

    const mostChanged = git.mostChangedFiles || [];
    if (mostChanged.length === 0) {
      changedFilesTbody.innerHTML = '<tr><td colspan="2" class="text-muted-cell">No recent file changes detected.</td></tr>';
    } else {
      changedFilesTbody.innerHTML = mostChanged.slice(0, 8).map(f => `
        <tr>
          <td class="code-font">${escapeHtml(f.file)}</td>
          <td class="text-right">${f.changes}</td>
        </tr>
      `).join("");
    }

    if (!graph.hasCycles || cycles.length === 0) {
      cyclesContainer.innerHTML = `
        <div class="no-cycles-box">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
          </svg>
          No circular dependencies detected. Architecture is strictly acyclic.
        </div>
      `;
    } else {
      cyclesContainer.innerHTML = `
        <ul class="cycles-chain-list">
          ${cycles.map(c => `<li class="cycle-chain-item">${c.map(escapeHtml).join(" &rarr; ")}</li>`).join("")}
        </ul>
      `;
    }

    jsonCode.textContent = JSON.stringify(data, null, 2);
    jsonViewerSection.style.display = "none";
    toggleJsonBtn.textContent = "View JSON";

    resultsSection.style.display = "flex";
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  function renderDependencyGraph(files) {
    const allNodes = new Set();
    for (const [file, details] of Object.entries(files)) {
      allNodes.add(file);
      for (const dep of details.dependencies || []) {
        allNodes.add(dep);
      }
    }

    let candidateNodes = Array.from(allNodes);

    if (currentSearchQuery) {
      candidateNodes = candidateNodes.filter(f => f.toLowerCase().includes(currentSearchQuery));
    }

    if (currentFilterMode === "hotspots") {
      candidateNodes = candidateNodes.filter(f => (files[f]?.inDegree || 0) >= 2);
    }

    const sortedNodes = candidateNodes.sort((a, b) => {
      const da = (files[a]?.inDegree || 0) + (files[a]?.outDegree || 0);
      const db = (files[b]?.inDegree || 0) + (files[b]?.outDegree || 0);
      return db - da;
    });

    let displayNodes = sortedNodes;
    if (currentFilterMode === "core" && !currentSearchQuery) {
      displayNodes = sortedNodes.slice(0, 30);
    } else if (currentFilterMode === "all" && sortedNodes.length > 50) {
      displayNodes = sortedNodes.slice(0, 50);
    }

    graphCountBadge.textContent = `${displayNodes.length} of ${allNodes.size} files`;

    if (displayNodes.length === 0) {
      graphViewport.innerHTML = '<p class="text-muted-cell" style="padding: 48px; text-align: center;">No matching graph nodes found for this filter.</p>';
      hud.style.display = "none";
      return;
    }

    const displaySet = new Set(displayNodes);

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

    const positions = {};
    const totalCount = displayNodes.length;
    let size;

    if (totalCount <= 12) {
      const r = Math.max(140, totalCount * 24);
      size = (r + 80) * 2;
      const cx = size / 2;
      const cy = size / 2;
      displayNodes.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / totalCount - Math.PI / 2;
        const isHotspot = (files[node]?.inDegree || 0) >= 3;
        positions[node] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          r: isHotspot ? 22 : 16,
          isHotspot
        };
      });
    } else {
      const r1 = Math.max(90, hotspots.length * 28);
      const r2 = r1 + Math.max(120, intermediates.length * 16);
      const r3 = r2 + Math.max(120, leaves.length * 12);
      size = (r3 + 90) * 2;
      const cx = size / 2;
      const cy = size / 2;

      const placeRing = (ringNodes, radius, offset = 0, baseR = 16) => {
        ringNodes.forEach((node, idx) => {
          const angle = (2 * Math.PI * idx) / ringNodes.length - Math.PI / 2 + offset;
          const isHotspot = (files[node]?.inDegree || 0) >= 3;
          positions[node] = {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
            r: isHotspot ? 22 : baseR,
            isHotspot
          };
        });
      };

      if (hotspots.length > 0) placeRing(hotspots, r1, 0, 22);
      if (intermediates.length > 0) placeRing(intermediates, r2, Math.PI / (intermediates.length || 1), 16);
      if (leaves.length > 0) placeRing(leaves, r3, 0, 14);
    }

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

        edges.push({
          source: file,
          target: dep,
          x1: x1.toFixed(1),
          y1: y1.toFixed(1),
          x2: x2.toFixed(1),
          y2: y2.toFixed(1)
        });
      }
    }

    const edgeSvgElements = edges.map((e, idx) => `
      <line 
        id="edge-${idx}" 
        class="graph-edge" 
        data-source="${escapeHtml(e.source)}" 
        data-target="${escapeHtml(e.target)}" 
        x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" 
        marker-end="url(#graph-arrow)">
      </line>
    `).join("");

    const nodeSvgElements = displayNodes.map(file => {
      const pos = positions[file];
      const details = files[file] || {};
      const isHotspot = pos.isHotspot;
      const shortName = file.split("/").pop();

      return `
        <g class="graph-node-group" data-file="${escapeHtml(file)}">
          <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${pos.r}" 
            fill="${isHotspot ? "#ffebe9" : "#ffffff"}" 
            stroke="${isHotspot ? "#cf222e" : "#57606a"}" 
            stroke-width="${isHotspot ? "2.5" : "1.5"}">
          </circle>
          <text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" fill="#1f2328" font-size="10.5" font-weight="600" text-anchor="middle" dominant-baseline="middle">
            ${escapeHtml(shortName.length > 14 ? shortName.slice(0, 12) + ".." : shortName)}
          </text>
        </g>
      `;
    }).join("");

    graphViewport.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Dependency Graph">
        <defs>
          <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8c959f"></path>
          </marker>
        </defs>
        <g id="edges-layer">${edgeSvgElements}</g>
        <g id="nodes-layer">${nodeSvgElements}</g>
      </svg>
    `;

    setupInteractiveHover(files, displaySet);
  }

  function setupInteractiveHover(files, displaySet) {
    const nodeGroups = graphViewport.querySelectorAll(".graph-node-group");
    const edgeLines = graphViewport.querySelectorAll(".graph-edge");

    nodeGroups.forEach(group => {
      const file = group.dataset.file;
      const details = files[file] || {};
      const directDeps = new Set(details.dependencies || []);
      const directDependents = new Set(details.dependents || []);

      group.addEventListener("mouseenter", () => {
        hudFilename.textContent = file;
        hudInCount.textContent = details.inDegree || 0;
        hudOutCount.textContent = details.outDegree || 0;
        hudHotspotBadge.style.display = (details.inDegree || 0) >= 3 ? "inline-block" : "none";
        hud.style.display = "flex";

        nodeGroups.forEach(ng => {
          const f = ng.dataset.file;
          if (f === file || directDeps.has(f) || directDependents.has(f)) {
            ng.classList.remove("is-dimmed");
          } else {
            ng.classList.add("is-dimmed");
          }
        });

        group.classList.add("is-hovered");

        edgeLines.forEach(edge => {
          const src = edge.dataset.source;
          const tgt = edge.dataset.target;
          if (src === file) {
            edge.classList.add("is-outgoing");
            edge.classList.remove("is-dimmed", "is-incoming");
          } else if (tgt === file) {
            edge.classList.add("is-incoming");
            edge.classList.remove("is-dimmed", "is-outgoing");
          } else {
            edge.classList.add("is-dimmed");
            edge.classList.remove("is-incoming", "is-outgoing");
          }
        });
      });

      group.addEventListener("mouseleave", () => {
        hud.style.display = "none";
        nodeGroups.forEach(ng => {
          ng.classList.remove("is-dimmed", "is-hovered");
        });
        edgeLines.forEach(edge => {
          edge.classList.remove("is-dimmed", "is-incoming", "is-outgoing");
        });
      });
    });
  }

  function showLoading() {
    loadingSection.style.display = "flex";
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add("is-loading");
  }

  function hideLoading() {
    loadingSection.style.display = "none";
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove("is-loading");
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.style.display = "flex";
    errorBox.scrollIntoView({ behavior: "smooth" });
  }

  function hideError() {
    errorBox.style.display = "none";
    errorMessage.textContent = "";
  }

  function hideResults() {
    resultsSection.style.display = "none";
  }
})();
