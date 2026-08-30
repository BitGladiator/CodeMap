import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";

import { createServer } from "../src/server.js";
import { isValidGitHubUrl, parseGitHubUrl, cloneAndAnalyze } from "../src/git/clone.js";

function simulateRequest(server, { method = "GET", url = "/", headers = {}, body = null }) {
  return new Promise((resolve) => {
    const handler = server.listeners("request")[0];

    const req = new Readable({
      read() {
        if (body) {
          this.push(typeof body === "object" ? JSON.stringify(body) : body);
        }
        this.push(null);
      }
    });
    req.method = method;
    req.url = url;
    req.headers = { ...headers };
    if (body && typeof body === "object") {
      req.headers["content-type"] = "application/json";
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res._data = "";

    res.setHeader = function(k, v) {
      this.headers[k.toLowerCase()] = v;
    };
    res.writeHead = function(code, headers = {}) {
      this.statusCode = code;
      for (const [k, v] of Object.entries(headers)) {
        this.setHeader(k, v);
      }
    };
    res.write = function(chunk) {
      this._data += chunk;
    };
    res.end = function(chunk) {
      if (chunk) this._data += chunk;
      resolve({
        statusCode: this.statusCode,
        headers: this.headers,
        body: this._data
      });
    };

    handler(req, res);
  });
}

test("isValidGitHubUrl validates standard GitHub HTTPS URLs", () => {
  assert.strictEqual(isValidGitHubUrl("https://github.com/facebook/react"), true);
  assert.strictEqual(isValidGitHubUrl("https://github.com/expressjs/express.git"), true);
  assert.strictEqual(isValidGitHubUrl("https://github.com/lodash/lodash/"), true);
  assert.strictEqual(isValidGitHubUrl("https://github.com/user-name/repo_name.js"), true);

  assert.strictEqual(isValidGitHubUrl(""), false);
  assert.strictEqual(isValidGitHubUrl(null), false);
  assert.strictEqual(isValidGitHubUrl("http://github.com/facebook/react"), false);
  assert.strictEqual(isValidGitHubUrl("https://gitlab.com/user/repo"), false);
  assert.strictEqual(isValidGitHubUrl("https://github.com/"), false);
  assert.strictEqual(isValidGitHubUrl("https://github.com/foo"), false);
  assert.strictEqual(isValidGitHubUrl("https://github.com/foo/bar; rm -rf /"), false);
  assert.strictEqual(isValidGitHubUrl("git@github.com:user/repo.git"), false);
});

test("parseGitHubUrl extracts owner and repository accurately", () => {
  const parsed = parseGitHubUrl("https://github.com/facebook/react.git");
  assert.strictEqual(parsed.owner, "facebook");
  assert.strictEqual(parsed.repo, "react");
  assert.strictEqual(parsed.fullName, "facebook/react");
  assert.strictEqual(parsed.cloneUrl, "https://github.com/facebook/react.git");
});

test("Server: GET /health returns 200 with status ok", async () => {
  const server = createServer();
  const res = await simulateRequest(server, { url: "/health" });

  assert.strictEqual(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.strictEqual(json.status, "ok");
  assert.strictEqual(json.service, "codemap");
});

test("Server: serves static frontend assets", async () => {
  const server = createServer();

  const indexRes = await simulateRequest(server, { url: "/" });
  assert.strictEqual(indexRes.statusCode, 200);
  assert.ok(indexRes.headers["content-type"].includes("text/html"));

  const cssRes = await simulateRequest(server, { url: "/style.css" });
  assert.strictEqual(cssRes.statusCode, 200);
  assert.ok(cssRes.headers["content-type"].includes("text/css"));

  const jsRes = await simulateRequest(server, { url: "/app.js" });
  assert.strictEqual(jsRes.statusCode, 200);
  assert.ok(jsRes.headers["content-type"].includes("application/javascript"));
});

test("Server: POST /api/analyze with missing or invalid URL returns 400", async () => {
  const server = createServer();

  const emptyRes = await simulateRequest(server, {
    method: "POST",
    url: "/api/analyze",
    body: {}
  });
  assert.strictEqual(emptyRes.statusCode, 400);
  const emptyJson = JSON.parse(emptyRes.body);
  assert.strictEqual(emptyJson.success, false);

  const invalidRes = await simulateRequest(server, {
    method: "POST",
    url: "/api/analyze",
    body: { url: "not-a-valid-url" }
  });
  assert.strictEqual(invalidRes.statusCode, 400);
  const invalidJson = JSON.parse(invalidRes.body);
  assert.strictEqual(invalidJson.success, false);
  assert.ok(invalidJson.error.includes("Invalid GitHub repository URL"));
});

test("Server: POST /api/analyze with local fixture runs complete analysis pipeline", async () => {
  const server = createServer();

  const res = await simulateRequest(server, {
    method: "POST",
    url: "/api/analyze",
    body: { url: "local:demo-project" }
  });

  assert.strictEqual(res.statusCode, 200);
  const json = JSON.parse(res.body);

  assert.strictEqual(json.success, true);
  assert.ok(json.data.graph);
  assert.ok(json.data.graph.nodeCount > 0);
  assert.ok(json.data.graph.edgeCount >= 0);
  assert.ok(Array.isArray(json.data.graph.hotspots));
  assert.ok(json.data.git);
  assert.ok(Array.isArray(json.data.highImpactFiles));
  assert.ok(typeof json.data.htmlReport === "string");
  assert.ok(json.data.htmlReport.includes("<!DOCTYPE html>"));
});

test("cloneAndAnalyze cleans up temporary directory even on failure", async () => {
  await assert.rejects(
    async () => {
      await cloneAndAnalyze("https://github.com/invalid-owner/non-existent-repo-12345", () => {}, { timeoutMs: 3000 });
    },
    /Failed to clone|Repository not found|Invalid GitHub/
  );
});
