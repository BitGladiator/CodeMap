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
const { analyzeChanges, findHighImpactFiles, formatReport } = require("../src/git/history");

const FIXTURE = path.join(__dirname, "fixtures", "demo-project");
const DB_FILE = path.join(FIXTURE, "src", "database.js");

let passCount = 0;

function pass(name) {
  passCount++;
  console.log(`PASS: ${name}`);
}

// ---------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------

/**
 * Strips out any "// change N" lines that a previous test run may have
 * appended to database.js, so every run starts from the same clean
 * baseline instead of the file growing forever. This fixes the test
 * pollution issue — run this suite 100 times, database.js stays the
 * same size.
 */
function resetDatabaseFixture() {
  let content = fs.readFileSync(DB_FILE, "utf-8");
  content = content.replace(/\n?\/\/ change \d+\n?/g, "\n");
  content = content.replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
  fs.writeFileSync(DB_FILE, content);
}

function setupFixtureGitRepo() {
  const gitDir = path.join(FIXTURE, ".git");

  // clean up any previous run so this is safe to re-run
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  resetDatabaseFixture();

  execSync("git init -q", { cwd: FIXTURE });
  execSync('git config user.email "test@test.com"', { cwd: FIXTURE });
  execSync('git config user.name "test"', { cwd: FIXTURE });
  execSync("git add .", { cwd: FIXTURE });
  execSync('git commit -q -m "init"', { cwd: FIXTURE });

  // simulate database.js being changed a lot (it's the hotspot)
  for (let i = 0; i < 5; i++) {
    fs.appendFileSync(DB_FILE, `\n// change ${i}\n`);
    execSync("git add .", { cwd: FIXTURE });
    execSync(`git commit -q -m "update database ${i}"`, { cwd: FIXTURE });
  }
}

// ---------------------------------------------------------------
// CORE TESTS
// ---------------------------------------------------------------

function testAnalyzeChangesOnNonGitFolder() {
  const result = analyzeChanges("/tmp"); // not a git repo (probably)
  assert.strictEqual(typeof result.commitCount, "number");
  pass("non-git folder doesn't crash");
}

function testAnalyzeChangesOnFixture() {
  const result = analyzeChanges(FIXTURE);
  assert.ok(result.commitCount >= 4, "expected at least 4 commits");
  assert.ok(result.mostChangedFiles.length > 0, "expected changed files");
  pass("git analysis on fixture repo works");
}

function testHighImpactFiles() {
  const gitAnalysis = analyzeChanges(FIXTURE);
  const fakeDependents = { "src/database.js": 4 }; // pretend Graph module says this
  const result = findHighImpactFiles(gitAnalysis, fakeDependents, 1);
  assert.ok(result.length > 0, "expected at least one high impact file");
  pass("high impact file combination works");
}

function testInvalidPathDoesNotCrash() {
  const fakePath = path.join(__dirname, "this-folder-does-not-exist-123");
  const result = analyzeChanges(fakePath);
  assert.strictEqual(typeof result.commitCount, "number");
  pass("invalid/non-existent path fails gracefully");
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
  pass("zero-commit git repo doesn't crash");

  fs.rmSync(emptyRepo, { recursive: true, force: true });
}

// ---------------------------------------------------------------
// NEW EDGE CASE TESTS
// ---------------------------------------------------------------

/**
 * EDGE CASE: no more test pollution.
 * Run setup, count how many "// change N" markers are in the file —
 * should always be exactly 5 (the number this run adds), never more,
 * even if this test file has been run many times before.
 */
function testNoFixturePollution() {
  const content = fs.readFileSync(DB_FILE, "utf-8");
  const matches = content.match(/\/\/ change \d+/g) || [];
  assert.strictEqual(matches.length, 5, "database.js should have exactly 5 change markers, not accumulating");
  pass("fixture file doesn't accumulate change markers across runs");
}

/**
 * EDGE CASE: git rename detection.
 * Renames a file mid-history and checks analyzeChanges reports the NEW
 * path cleanly — not a garbled "old\tnew" string (the bug that was fixed).
 * Runs in its own throwaway repo so it doesn't touch the shared fixture.
 */
function testGitRenameDetection() {
  const tempRepo = path.join(__dirname, "fixtures", "temp-rename-test");
  if (fs.existsSync(tempRepo)) {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRepo, { recursive: true });

  fs.writeFileSync(path.join(tempRepo, "old-name.js"), "// original content\n");
  execSync("git init -q", { cwd: tempRepo });
  execSync('git config user.email "test@test.com"', { cwd: tempRepo });
  execSync('git config user.name "test"', { cwd: tempRepo });
  execSync("git add .", { cwd: tempRepo });
  execSync('git commit -q -m "add old-name.js"', { cwd: tempRepo });

  execSync("git mv old-name.js new-name.js", { cwd: tempRepo });
  execSync('git commit -q -m "rename to new-name.js"', { cwd: tempRepo });

  const result = analyzeChanges(tempRepo);
  const files = result.mostChangedFiles.map((f) => f.file);

  const hasGarbledEntry = files.some((f) => f.includes("\t") || f.includes("old-name.js\tnew-name.js"));
  assert.ok(!hasGarbledEntry, "rename should not produce a garbled 'old\\tnew' path");
  assert.ok(files.includes("new-name.js"), "rename should report the NEW file path");

  pass("git rename is parsed correctly (new path only, not garbled)");

  fs.rmSync(tempRepo, { recursive: true, force: true });
}

/**
 * EDGE CASE: defensive checks — null/undefined inputs should never crash.
 */
function testDefensiveNullInputs() {
  assert.doesNotThrow(() => analyzeChanges(null), "analyzeChanges(null) should not throw");
  assert.doesNotThrow(() => analyzeChanges(undefined), "analyzeChanges(undefined) should not throw");
  assert.strictEqual(analyzeChanges(null).commitCount, 0);

  assert.doesNotThrow(
    () => findHighImpactFiles(null, {}, 1),
    "findHighImpactFiles(null, ...) should not throw"
  );
  assert.deepStrictEqual(findHighImpactFiles(null, {}, 1), []);

  assert.doesNotThrow(
    () => findHighImpactFiles(analyzeChanges(FIXTURE), null, 1),
    "findHighImpactFiles(..., null, ...) should not throw"
  );
  assert.doesNotThrow(
    () => findHighImpactFiles(undefined, undefined, undefined),
    "findHighImpactFiles(undefined, undefined, undefined) should not throw"
  );

  pass("null/undefined inputs are handled defensively without crashing");
}

/**
 * EDGE CASE: CLI output is a readable formatted report, not raw JSON.
 */
function testFormattedReportOutput() {
  const analysis = analyzeChanges(FIXTURE);
  const report = formatReport(analysis);

  assert.ok(typeof report === "string", "formatReport should return a string");
  assert.ok(report.includes("RECENT CHANGES"), "report should have a header");
  assert.ok(report.includes("Files changed:"), "report should show files changed");
  assert.ok(!report.trim().startsWith("{"), "report should not look like raw JSON");

  pass("CLI output is a human-readable formatted report");
}

/**
 * EDGE CASE: large commit history — make sure commitLimit is actually
 * respected and the function doesn't choke on a repo with many commits.
 */
function testLargeCommitHistoryRespectsLimit() {
  const bigRepo = path.join(__dirname, "fixtures", "temp-large-history");
  if (fs.existsSync(bigRepo)) {
    fs.rmSync(bigRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(bigRepo, { recursive: true });

  execSync("git init -q", { cwd: bigRepo });
  execSync('git config user.email "test@test.com"', { cwd: bigRepo });
  execSync('git config user.name "test"', { cwd: bigRepo });

  const file = path.join(bigRepo, "file.js");
  const TOTAL_COMMITS = 25;
  for (let i = 0; i < TOTAL_COMMITS; i++) {
    fs.appendFileSync(file, `// line ${i}\n`);
    execSync("git add .", { cwd: bigRepo });
    execSync(`git commit -q -m "commit ${i}"`, { cwd: bigRepo });
  }

  const limited = analyzeChanges(bigRepo, 10);
  assert.strictEqual(limited.commitCount, 10, "should only count the last 10 commits when limit=10");

  const all = analyzeChanges(bigRepo, TOTAL_COMMITS);
  assert.strictEqual(all.commitCount, TOTAL_COMMITS, "should count all commits when limit covers them all");

  pass("commitLimit is respected on a repo with many commits");

  fs.rmSync(bigRepo, { recursive: true, force: true });
}

/**
 * EDGE CASE: filenames with spaces and unicode characters shouldn't crash
 * the parser or get mangled.
 */
function testSpecialCharacterFilenames() {
  const specialRepo = path.join(__dirname, "fixtures", "temp-special-chars");
  if (fs.existsSync(specialRepo)) {
    fs.rmSync(specialRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(specialRepo, { recursive: true });

  execSync("git init -q", { cwd: specialRepo });
  execSync('git config user.email "test@test.com"', { cwd: specialRepo });
  execSync('git config user.name "test"', { cwd: specialRepo });

  const spacedFile = path.join(specialRepo, "my file.js");
  const unicodeFile = path.join(specialRepo, "café-utils.js");
  fs.writeFileSync(spacedFile, "// spaced filename\n");
  fs.writeFileSync(unicodeFile, "// unicode filename\n");

  execSync("git add .", { cwd: specialRepo });
  execSync('git commit -q -m "add special filenames"', { cwd: specialRepo });

  assert.doesNotThrow(() => analyzeChanges(specialRepo), "should not crash on special-character filenames");

  const result = analyzeChanges(specialRepo);
  const files = result.mostChangedFiles.map((f) => f.file);
  assert.ok(
    files.some((f) => f.includes("my file.js") || f.includes("my\\040file.js")),
    "spaced filename should appear in results (git may quote it)"
  );

  pass("filenames with spaces/unicode don't crash the parser");

  fs.rmSync(specialRepo, { recursive: true, force: true });
}

/**
 * EDGE CASE: multiple renames happening in the SAME commit should all be
 * parsed correctly, not just the first one.
 */
function testMultipleRenamesInSameCommit() {
  const multiRepo = path.join(__dirname, "fixtures", "temp-multi-rename");
  if (fs.existsSync(multiRepo)) {
    fs.rmSync(multiRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(multiRepo, { recursive: true });

  execSync("git init -q", { cwd: multiRepo });
  execSync('git config user.email "test@test.com"', { cwd: multiRepo });
  execSync('git config user.name "test"', { cwd: multiRepo });

  fs.writeFileSync(path.join(multiRepo, "a-old.js"), "// content that is long enough to be detected as a rename by git\n".repeat(3));
  fs.writeFileSync(path.join(multiRepo, "b-old.js"), "// another file with enough content to count as a rename too\n".repeat(3));
  execSync("git add .", { cwd: multiRepo });
  execSync('git commit -q -m "add originals"', { cwd: multiRepo });

  execSync("git mv a-old.js a-new.js", { cwd: multiRepo });
  execSync("git mv b-old.js b-new.js", { cwd: multiRepo });
  execSync('git commit -q -m "rename both files"', { cwd: multiRepo });

  const result = analyzeChanges(multiRepo);
  const files = result.mostChangedFiles.map((f) => f.file);

  assert.ok(!files.some((f) => f.includes("\t")), "no entry should contain a raw tab character");
  assert.ok(files.includes("a-new.js"), "expected a-new.js to be reported");
  assert.ok(files.includes("b-new.js"), "expected b-new.js to be reported");

  pass("multiple renames in the same commit are all parsed correctly");

  fs.rmSync(multiRepo, { recursive: true, force: true });
}

/**
 * EDGE CASE: a file deleted and later re-created with the same name
 * should have its changes counted correctly (not lost or double-counted
 * incorrectly).
 */
function testDeletedThenRecreatedFile() {
  const dcRepo = path.join(__dirname, "fixtures", "temp-delete-recreate");
  if (fs.existsSync(dcRepo)) {
    fs.rmSync(dcRepo, { recursive: true, force: true });
  }
  fs.mkdirSync(dcRepo, { recursive: true });

  execSync("git init -q", { cwd: dcRepo });
  execSync('git config user.email "test@test.com"', { cwd: dcRepo });
  execSync('git config user.name "test"', { cwd: dcRepo });

  const target = path.join(dcRepo, "flaky.js");

  fs.writeFileSync(target, "// v1\n");
  execSync("git add .", { cwd: dcRepo });
  execSync('git commit -q -m "add flaky.js"', { cwd: dcRepo });

  fs.rmSync(target);
  execSync("git add -A", { cwd: dcRepo });
  execSync('git commit -q -m "delete flaky.js"', { cwd: dcRepo });

  fs.writeFileSync(target, "// v2, recreated\n");
  execSync("git add .", { cwd: dcRepo });
  execSync('git commit -q -m "recreate flaky.js"', { cwd: dcRepo });

  const result = analyzeChanges(dcRepo);
  const entry = result.mostChangedFiles.find((f) => f.file === "flaky.js");

  assert.ok(entry, "flaky.js should still show up in mostChangedFiles");
  assert.ok(entry.changes >= 3, "flaky.js should be counted for add + delete + re-add (at least 3 changes)");
  assert.ok(result.added >= 2, "should count at least 2 'added' events (original + recreated)");
  assert.ok(result.deleted >= 1, "should count at least 1 'deleted' event");

  pass("deleted-then-recreated file is counted correctly, not lost");

  fs.rmSync(dcRepo, { recursive: true, force: true });
}

// ---------------------------------------------------------------
// RUN ALL
// ---------------------------------------------------------------

try {
  setupFixtureGitRepo();

  testAnalyzeChangesOnNonGitFolder();
  testAnalyzeChangesOnFixture();
  testHighImpactFiles();
  testInvalidPathDoesNotCrash();
  testZeroCommitRepo();

  testNoFixturePollution();
  testGitRenameDetection();
  testDefensiveNullInputs();
  testFormattedReportOutput();

  testLargeCommitHistoryRespectsLimit();
  testSpecialCharacterFilenames();
  testMultipleRenamesInSameCommit();
  testDeletedThenRecreatedFile();

  console.log(`\nALL ${passCount} TESTS PASSED`);
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}