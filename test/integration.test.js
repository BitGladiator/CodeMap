/**
 * test/integration.test.js
 * Owner: Sneha
 *
 * Run: node test/integration.test.js
 * No third-party test framework used — plain node:assert.
 */

const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { analyzeChanges, findHighImpactFiles } = require("../src/git/history");

const FIXTURE = path.join(__dirname, "fixtures", "demo-project");

function setupFixtureGitRepo() {
  const gitDir = path.join(FIXTURE, ".git");

  // clean up any previous run so this is safe to re-run
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  execSync("git init -q", { cwd: FIXTURE });
  execSync('git config user.email "test@test.com"', { cwd: FIXTURE });
  execSync('git config user.name "test"', { cwd: FIXTURE });
  execSync("git add .", { cwd: FIXTURE });
  execSync('git commit -q -m "init"', { cwd: FIXTURE });

  // simulate database.ts being changed a lot (it's the hotspot)
  // NOTE: fixture is .ts (not .js) — match the real fixture file
  const dbFile = path.join(FIXTURE, "src", "database.ts");
  for (let i = 0; i < 5; i++) {
    fs.appendFileSync(dbFile, `\n// change ${i}\n`);
    execSync("git add .", { cwd: FIXTURE });
    execSync(`git commit -q -m "update database ${i}"`, { cwd: FIXTURE });
  }
}

function testAnalyzeChangesOnNonGitFolder() {
  const result = analyzeChanges("/tmp"); // not a git repo (probably)
  assert.strictEqual(typeof result.commitCount, "number");
  console.log("PASS: non-git folder doesn't crash");
}

function testAnalyzeChangesOnFixture() {
  const result = analyzeChanges(FIXTURE);
  assert.ok(result.commitCount >= 4, "expected at least 4 commits");
  assert.ok(result.mostChangedFiles.length > 0, "expected changed files");
  console.log("PASS: git analysis on fixture repo works");
}

function testHighImpactFiles() {
  const gitAnalysis = analyzeChanges(FIXTURE);
  const fakeDependents = { "src/database.ts": 4 }; // pretend Graph module says this
  const result = findHighImpactFiles(gitAnalysis, fakeDependents, 1);
  assert.ok(result.length > 0, "expected at least one high impact file");
  console.log("PASS: high impact file combination works");
}

function testInvalidPathDoesNotCrash() {
  const fakePath = path.join(__dirname, "this-folder-does-not-exist-123");
  const result = analyzeChanges(fakePath);
  assert.strictEqual(typeof result.commitCount, "number");
  console.log("PASS: invalid/non-existent path fails gracefully");
}

function testZeroCommitRepo() {
  const emptyRepo = path.join(__dirname, "fixtures", "empty-git-repo");
  if (fs.existsSync(emptyRepo)) {
    fs.rmSync(emptyRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(emptyRepo, { recursive: true });
  execSync("git init -q", { cwd: emptyRepo });
  execSync('git config user.email "test@test.com"', { cwd: emptyRepo });
  execSync('git config user.name "test"', { cwd: emptyRepo });
  // deliberately no commits

  const result = analyzeChanges(emptyRepo);
  assert.strictEqual(result.commitCount, 0, "expected 0 commits on a fresh repo");
  console.log("PASS: zero-commit git repo doesn't crash");

  fs.rmSync(emptyRepo, { recursive: true, force: true });
}

// ---- run all ----
try {
  setupFixtureGitRepo();
  testAnalyzeChangesOnNonGitFolder();
  testAnalyzeChangesOnFixture();
  testHighImpactFiles();
  testInvalidPathDoesNotCrash();
  testZeroCommitRepo();
  console.log("\nALL TESTS PASSED");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}
