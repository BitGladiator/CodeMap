import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { performAnalysis } from "./cli.js";
import { cloneAndAnalyze, isValidGitHubUrl } from "./git/clone.js";
import { formatHtmlOutput } from "./output/html.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req, maxSizeBytes = 1048576) {
  return new Promise((resolve, reject) => {
    let body = "";
    let byteCount = 0;

    req.on("data", (chunk) => {
      byteCount += chunk.length;
      if (byteCount > maxSizeBytes) {
        req.destroy();
        reject(new Error("Request payload too large"));
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Malformed JSON payload"));
      }
    });

    req.on("error", (err) => reject(err));
  });
}

function serveStaticFile(req, res) {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(res, 404, { error: "Not Found" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

function setupKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || process.env.APP_URL;
  if (!targetUrl) return;

  const healthUrl = targetUrl.replace(/\/+$/, "") + "/health";
  const INTERVAL_MS = 10 * 60 * 1000;

  setInterval(() => {
    try {
      const client = healthUrl.startsWith("https") ? https : http;
      client.get(healthUrl, () => {}).on("error", () => {});
    } catch {}
  }, INTERVAL_MS).unref();
}

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const pathname = req.url.split("?")[0];

    if (req.method === "GET" && (pathname === "/health" || pathname === "/api/health")) {
      sendJson(res, 200, { status: "ok", service: "codemap" });
      return;
    }

    if (req.method === "POST" && pathname === "/api/analyze") {
      try {
        const body = await parseJsonBody(req);
        const { url, repoPath } = body;

        if (url === "local:demo-project" || repoPath === "demo-project") {
          const target = path.join(__dirname, "../test/fixtures/demo-project");
          const analysis = performAnalysis(target);
          const htmlReport = formatHtmlOutput(analysis);
          sendJson(res, 200, {
            success: true,
            data: {
              repository: "demo-project (local fixture)",
              url: null,
              ...analysis,
              htmlReport
            }
          });
          return;
        }

        if (url === "local:codemap" || repoPath === "codemap") {
          const target = path.join(__dirname, "..");
          const analysis = performAnalysis(target);
          const htmlReport = formatHtmlOutput(analysis);
          sendJson(res, 200, {
            success: true,
            data: {
              repository: "CodeMap (local repository)",
              url: null,
              ...analysis,
              htmlReport
            }
          });
          return;
        }

        if (!url || typeof url !== "string") {
          sendJson(res, 400, {
            success: false,
            error: "Repository URL is required. Please provide a valid GitHub HTTPS URL."
          });
          return;
        }

        if (!isValidGitHubUrl(url)) {
          sendJson(res, 400, {
            success: false,
            error: "Invalid GitHub repository URL. Expected format: https://github.com/owner/repository"
          });
          return;
        }

        const result = await cloneAndAnalyze(url, performAnalysis);
        const htmlReport = formatHtmlOutput(result);

        sendJson(res, 200, {
          success: true,
          data: {
            ...result,
            htmlReport
          }
        });
      } catch (err) {
        const statusCode = err.message.includes("Invalid GitHub") ? 400 : 500;
        sendJson(res, statusCode, {
          success: false,
          error: err.message || "An unexpected error occurred during repository analysis"
        });
      }
      return;
    }

    if (req.method === "GET") {
      serveStaticFile(req, res);
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const HOST = process.env.HOST || "0.0.0.0";
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`  CodeMap Web Application is running!`);
    console.log(`  Listening on: http://${HOST}:${PORT}`);
    console.log(`  Zero third-party dependencies active`);
    console.log(`======================================================\n`);
    setupKeepAlive();
  });
}
