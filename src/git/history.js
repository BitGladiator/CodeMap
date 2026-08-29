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
  return fs.existsSync(path.join(repoPath, ".git"));
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

// ---------- Core: analyze last N commits ----------

function analyzeChanges(repoPath, commitLimit = 10) {
  if (!isGitRepo(repoPath)) {
    return {
      commitCount: 0,
      filesChanged: 0,
      added: 0,
      modified: 0,
      deleted: 0,
      mostChangedFiles: [],
    };
  }

  // --name-status gives us A/M/D + filename per changed file, per commit
  // Format: one line per file: "M\tsrc/server.js"
  const raw = runGit(
    repoPath,
    `log -n ${commitLimit} --name-status --pretty=format:"__COMMIT__"`
  );

  if (!raw.trim()) {
    return {
      commitCount: 0,
      filesChanged: 0,
      added: 0,
      modified: 0,
      deleted: 0,
      mostChangedFiles: [],
    };
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

    const [status, ...fileParts] = line.split("\t");
    const file = fileParts.join("\t").trim();
    if (!file) continue;

    touchedFiles.add(file);
    changeCounts.set(file, (changeCounts.get(file) || 0) + 1);

    switch (status[0]) {
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
  return gitAnalysis.mostChangedFiles
    .filter((f) => f.changes >= threshold)
    .map((f) => {
      const dependents = dependentsByFile[f.file] ?? 0;
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

module.exports = { analyzeChanges, findHighImpactFiles };

// ---------- Quick manual test ----------
// Run with: node src/git/history.js .
if (require.main === module) {
  const target = process.argv[2] || ".";
  console.log(JSON.stringify(analyzeChanges(target), null, 2));
}
