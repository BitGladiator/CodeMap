function formatTerminalOutput(data) {
  const lines = [];

  lines.push("CODEMAP");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  lines.push("PROJECT SUMMARY");
  lines.push("");
  lines.push(`Files:              ${data.graph.nodeCount}`);
  lines.push(`Dependencies:       ${data.graph.edgeCount}`);
  lines.push(
    `Circular deps:      ${
      data.graph.hasCycles ? data.graph.cycles.length : 0
    }`
  );

  lines.push("");
  lines.push("HOTSPOTS");
  lines.push("");

  if (data.graph.hotspots.length === 0) {
    lines.push("No hotspots found.");
  } else {
    data.graph.hotspots.slice(0, 5).forEach((hotspot, index) => {
      lines.push(
        `${index + 1}. ${hotspot.file} - ${hotspot.dependents} dependents`
      );
    });
  }

  lines.push("");
  lines.push("RECENT CHANGES");
  lines.push("");

  lines.push(`Commits analyzed:   ${data.git.commitCount}`);
  lines.push(`Files changed:      ${data.git.filesChanged}`);
  lines.push(`Added:              ${data.git.added}`);
  lines.push(`Modified:           ${data.git.modified}`);
  lines.push(`Deleted:            ${data.git.deleted}`);

  lines.push("");
  lines.push("MOST CHANGED FILES");
  lines.push("");

  if (data.git.mostChangedFiles.length === 0) {
    lines.push("No recent file changes found.");
  } else {
    data.git.mostChangedFiles.slice(0, 5).forEach((file, index) => {
      lines.push(`${index + 1}. ${file.file} - ${file.changes} changes`);
    });
  }

  lines.push("");
  lines.push("HIGH IMPACT FILES");
  lines.push("");

  if (data.highImpactFiles.length === 0) {
    lines.push("No high-impact files detected.");
  } else {
    for (const file of data.highImpactFiles) {
      lines.push(file.file);
      lines.push(
        `${file.recentChanges} recent changes · ${file.currentDependents} dependents`
      );
      lines.push(file.note);
      lines.push("");
    }
  }

  lines.push("CIRCULAR DEPENDENCIES");
  lines.push("");

  if (!data.graph.hasCycles || data.graph.cycles.length === 0) {
    lines.push("No circular dependencies found.");
  } else {
    for (const cycle of data.graph.cycles) {
      lines.push(cycle.join(" → "));
    }
  }

  return lines.join("\n");
}

module.exports = {
  formatTerminalOutput,
};