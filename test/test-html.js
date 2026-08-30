const fs = require("fs");
const path = require("path");

const analysisResult = require("./fixtures/analysis-result");

const {
  formatHtmlOutput,
} = require("../src/output/html");

const html = formatHtmlOutput(analysisResult);

const outputPath = path.join(__dirname, "codemap-report.html");

fs.writeFileSync(outputPath, html, "utf8");

console.log(`HTML report generated: ${outputPath}`);