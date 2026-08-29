/**
 * src/git/history.js
 * Owner: Sneha
 *
 * Analyzes recent Git activity in a repository using only the `git` CLI
 * via child_process. No third-party git libraries (per project rules).
 *
 * Requires: the target folder must be a git repo (has a .git dir) and
 * the `git` binary must be on PATH.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// ---------- Helpers ----------

function isGitRepo(repoPath) {
  // defensive: don't crash on null/undefined/non-string input
  if (!repoPath || typeof repoPath !== "string") return false;
  try {
    return fs.existsSync(path.join(repoPath, ".git"));
  } catch {
    return false;
  }
}

function runGit(repoPath, args) {
  try {
    return execSync(`git ${args}`, {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (err) {
    // repo might have zero commits yet, or git not installed, etc.
    return "";
  }
}

/**
 * Parses one line of `git log --name-status` output.
 * Normal lines look like:      "M\tsrc/server.js"
 * Rename lines look like:      "R100\told/path.js\tnew/path.js"
 * Copy lines look like:        "C100\tsrc/a.js\tsrc/b.js"
 * For renames/copies we only care about the NEW path (last column) —
 * not "old\tnew" joined together.
 */
function parseNameStatusLine(line) {
  const parts = line.split("\t");
  if (parts.length < 2) return null;

  const status = parts[0];
  let file;

  if (status[0] === "R" || status[0] === "C") {
    // rename/copy: last column is the new path
    file = parts[parts.length - 1];
  } else {
    file = parts[1];
  }

  if (!file) return null;
  return { status: status[0], file: file.trim() };
}

// ---------- Core: analyze last N commits ----------

function analyzeChanges(repoPath, commitLimit = 10) {
  const empty = {
    commitCount: 0,
    filesChanged: 0,
    added: 0,
    modified: 0,
    deleted: 0,
    mostChangedFiles: [],
  };

  if (!isGitRepo(repoPath)) {
    return empty;
  }

  // --name-status gives us A/M/D/R/C + filename per changed file, per commit
  const raw = runGit(
    repoPath,
    `log -n ${commitLimit} --name-status --pretty=format:"__COMMIT__"`
  );

  if (!raw.trim()) {
    return empty;
  }

  const lines = raw.split("\n");
  let commitCount = 0;
  let added = 0;
  let modified = 0;
  let deleted = 0;
  const changeCounts = new Map();
  const touchedFiles = new Set();

  for (const line of lines) {
    if (line === "__COMMIT__") {
      commitCount++;
      continue;
    }
    if (!line.trim()) continue;

    const parsed = parseNameStatusLine(line);
    if (!parsed) continue;

    const { status, file } = parsed;
    touchedFiles.add(file);
    changeCounts.set(file, (changeCounts.get(file) || 0) + 1);

    switch (status) {
      case "A":
        added++;
        break;
      case "M":
        modified++;
        break;
      case "D":
        deleted++;
        break;
      default:
        // R (rename), C (copy) etc. — count as modified for simplicity
        modified++;
    }
  }

  const mostChangedFiles = Array.from(changeCounts.entries())
    .map(([file, changes]) => ({ file, changes }))
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 10);

  return {
    commitCount,
    filesChanged: touchedFiles.size,
    added,
    modified,
    deleted,
    mostChangedFiles,
  };
}

// ---------- Combine with Graph data (the "Me" module's AnalysisResult) ----------
// This is the "Combine Git + Graph" feature from the doc — the strongest
// story CodeMap tells. Call this once you have dependent counts from Person 2.
//
// LOCKED SHAPE (tell the team — this is the final agreed format):
// { file, recentChanges, currentDependents, note }

function findHighImpactFiles(gitAnalysis, dependentsByFile, threshold = 5) {
  // defensive: don't crash on null/undefined/malformed input
  if (!gitAnalysis || !Array.isArray(gitAnalysis.mostChangedFiles)) {
    return [];
  }
  const safeDependents =
    dependentsByFile && typeof dependentsByFile === "object" ? dependentsByFile : {};

  return gitAnalysis.mostChangedFiles
    .filter((f) => f && typeof f.changes === "number" && f.changes >= threshold)
    .map((f) => {
      const dependents = safeDependents[f.file] ?? 0;
      return {
        file: f.file,
        recentChanges: f.changes,
        currentDependents: dependents,
        note:
          dependents > 0
            ? `Changes to this file may affect ${dependents} other file(s).`
            : "No tracked dependents.",
      };
    })
    .sort((a, b) => b.currentDependents - a.currentDependents);
}

// ---------- Human-readable CLI output (matches the spec format) ----------

function formatReport(analysis) {
  const lines = [];
  lines.push("RECENT CHANGES");
  lines.push("");
  lines.push(`Files changed: ${analysis.filesChanged}`);
  lines.push(`Added:         ${analysis.added}`);
  lines.push(`Modified:      ${analysis.modified}`);
  lines.push(`Deleted:       ${analysis.deleted}`);

  if (analysis.mostChangedFiles.length > 0) {
    lines.push("");
    lines.push("MOST CHANGED FILES");
    lines.push("");
    analysis.mostChangedFiles.slice(0, 3).forEach((f, i) => {
      lines.push(`${i + 1}. ${f.file}    ${f.changes} changes`);
    });
  }

  return lines.join("\n");
}

module.exports = { analyzeChanges, findHighImpactFiles, formatReport };

// ---------- Quick manual test ----------
// Run with: node src/git/history.js .
if (require.main === module) {
  const target = process.argv[2] || ".";
  console.log(formatReport(analyzeChanges(target)));
}
