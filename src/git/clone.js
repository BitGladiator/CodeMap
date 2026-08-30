import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?\/?$/;

export function isValidGitHubUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!GITHUB_URL_REGEX.test(trimmed)) return false;
  const match = trimmed.match(GITHUB_URL_REGEX);
  if (!match) return false;
  const [, owner, repo] = match;
  if (!owner || !repo || owner === "." || owner === ".." || repo === "." || repo === "..") {
    return false;
  }
  return true;
}

export function parseGitHubUrl(url) {
  const trimmed = (url || "").trim();
  const match = trimmed.match(GITHUB_URL_REGEX);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    cloneUrl: `https://github.com/${owner}/${repo}.git`
  };
}

export async function cloneAndAnalyze(repoUrl, analyzerFn, options = {}) {
  if (!isValidGitHubUrl(repoUrl)) {
    throw new Error("Invalid GitHub repository URL. Expected format: https://github.com/owner/repository");
  }

  const parsed = parseGitHubUrl(repoUrl);
  const timeoutMs = options.timeoutMs || 45000;
  const tmpPrefix = path.join(os.tmpdir(), `codemap-${crypto.randomBytes(6).toString("hex")}-`);
  const tmpDir = fs.mkdtempSync(tmpPrefix);

  try {
    try {
      execSync(`git clone --depth 15 --single-branch ${parsed.cloneUrl} "${tmpDir}"`, {
        timeout: timeoutMs,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0"
        }
      });
    } catch (cloneErr) {
      const stderr = cloneErr.stderr ? cloneErr.stderr.toString() : "";
      if (stderr.includes("Repository not found") || stderr.includes("Authentication failed")) {
        throw new Error("Repository not found or is private. Please verify the URL.");
      }
      if (cloneErr.killed || cloneErr.signal === "SIGTERM") {
        throw new Error("Cloning repository timed out. Please try a smaller repository.");
      }
      throw new Error(`Failed to clone repository: ${stderr.trim() || cloneErr.message}`);
    }

    const analysis = analyzerFn(tmpDir);
    return {
      repository: parsed.fullName,
      url: `https://github.com/${parsed.fullName}`,
      ...analysis
    };
  } finally {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error(`Failed to clean up temporary directory ${tmpDir}: ${cleanupErr.message}`);
    }
  }
}
