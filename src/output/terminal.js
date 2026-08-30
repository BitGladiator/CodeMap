export function formatTerminalOutput(data) {
  const lines = [];

  lines.push("CODEMAP");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  lines.push("PROJECT SUMMARY");
  lines.push("");
  lines.push(`Files:              ${data.graph?.nodeCount ?? 0}`);
  lines.push(`Dependencies:       ${data.graph?.edgeCount ?? 0}`);
  lines.push(
    `Circular deps:      ${
      data.graph?.hasCycles ? data.graph.cycles.length : 0
    }`
  );

  lines.push("");
  lines.push("HOTSPOTS");
  lines.push("");

  const hotspots = data.graph?.hotspots || [];
  if (hotspots.length === 0) {
    lines.push("No hotspots found.");
  } else {
    hotspots.slice(0, 5).forEach((hotspot, index) => {
      lines.push(
        `${index + 1}. ${hotspot.file} - ${hotspot.dependents} dependents`
      );
    });
  }

  lines.push("");
  lines.push("RECENT CHANGES");
  lines.push("");

  const git = data.git || {};
  lines.push(`Commits analyzed:   ${git.commitCount ?? 0}`);
  lines.push(`Files changed:      ${git.filesChanged ?? 0}`);
  lines.push(`Added:              ${git.added ?? 0}`);
  lines.push(`Modified:           ${git.modified ?? 0}`);
  lines.push(`Deleted:            ${git.deleted ?? 0}`);

  lines.push("");
  lines.push("MOST CHANGED FILES");
  lines.push("");

  const mostChanged = git.mostChangedFiles || [];
  if (mostChanged.length === 0) {
    lines.push("No recent file changes found.");
  } else {
    mostChanged.slice(0, 5).forEach((file, index) => {
      lines.push(`${index + 1}. ${file.file} - ${file.changes} changes`);
    });
  }

  lines.push("");
  lines.push("HIGH IMPACT FILES");
  lines.push("");

  const highImpact = data.highImpactFiles || [];
  if (highImpact.length === 0) {
    lines.push("No high-impact files detected.");
  } else {
    for (const file of highImpact) {
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

  const cycles = data.graph?.cycles || [];
  if (!data.graph?.hasCycles || cycles.length === 0) {
    lines.push("No circular dependencies found.");
  } else {
    for (const cycle of cycles) {
      lines.push(cycle.join(" → "));
    }
  }

  return lines.join("\n");
}