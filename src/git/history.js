const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function isGitRepo(repoPath) {
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
    return "";
  }
}

function decodeGitFilename(raw) {
  if (typeof raw !== "string") return raw;
  let file = raw.trim();

  if (file.startsWith('"') && file.endsWith('"')) {
    file = file.slice(1, -1);
    const bytes = [];
    for (let i = 0; i < file.length; i++) {
      if (file[i] === "\\" && /[0-7]{3}/.test(file.slice(i + 1, i + 4))) {
        bytes.push(parseInt(file.slice(i + 1, i + 4), 8));
        i += 3;
      } else {
        bytes.push(file.charCodeAt(i));
      }
    }
    try {
      file = Buffer.from(bytes).toString("utf-8");
    } catch {
    }
  }

  return file;
}

function parseNameStatusLine(line) {
  const parts = line.split("\t");
  if (parts.length < 2) return null;

  const status = parts[0];
  let file;

  if (status[0] === "R" || status[0] === "C") {
    file = parts[parts.length - 1];
  } else {
    file = parts[1];
  }

  if (!file) return null;
  return { status: status[0], file: decodeGitFilename(file) };
}

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
        modified++;
    }
  }

  const mostChangedFiles = Array.from(changeCounts.entries())
    .map(([file, changes]) => ({ file, changes }))
    .sort((a, b) => b.changes - a.changes);

  return {
    commitCount,
    filesChanged: touchedFiles.size,
    added,
    modified,
    deleted,
    mostChangedFiles,
  };
}

function normalizePath(p) {
  if (typeof p !== "string") return p;
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function findHighImpactFiles(gitAnalysis, dependentsByFile, threshold = 5) {
  if (!gitAnalysis || !Array.isArray(gitAnalysis.mostChangedFiles)) {
    return [];
  }
  const safeDependents =
    dependentsByFile && typeof dependentsByFile === "object" ? dependentsByFile : {};

  const normalizedDependents = {};
  for (const key of Object.keys(safeDependents)) {
    normalizedDependents[normalizePath(key)] = safeDependents[key];
  }

  return gitAnalysis.mostChangedFiles
    .filter((f) => f && typeof f.changes === "number" && f.changes >= threshold)
    .map((f) => {
      const dependents = normalizedDependents[normalizePath(f.file)] ?? 0;
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

if (require.main === module) {
  const target = process.argv[2] || ".";
  console.log(formatReport(analyzeChanges(target)));
}