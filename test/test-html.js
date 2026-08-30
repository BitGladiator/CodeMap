import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analysisResult } from "./fixtures/analysis-result.js";
import { formatHtmlOutput } from "../src/output/html.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = formatHtmlOutput(analysisResult);
const outputPath = path.join(__dirname, "codemap-report.html");

fs.writeFileSync(outputPath, html, "utf8");

console.log(`HTML report generated: ${outputPath}`);