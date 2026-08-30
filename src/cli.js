#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeProject } from "./scanner/project.js";
import { analyze as analyzeGraph } from "./graph/index.js";
import { analyzeChanges, findHighImpactFiles } from "./git/history.js";
import { formatTerminalOutput } from "./output/terminal.js";
import { formatJsonOutput } from "./output/json.js";
import { formatHtmlOutput } from "./output/html.js";

export function showHelp() {
  console.log(`
CodeMap - Repository Architecture & Change Analyser

Usage:
  node src/cli.js [path] [options]
  npx codemap [path] [options]

Options:
  --format all         Display terminal report AND generate HTML report (default)
  --format terminal    Display a readable terminal report
  --format html        Generate a standalone HTML report
  --format json        Display analysis as JSON
  --help, -h           Show this help message

Examples:
  node src/cli.js .
  node src/cli.js . --format all
  node src/cli.js . --format terminal
  node src/cli.js . --format html
  node src/cli.js . --format json
`);
}

export function parseArguments(args) {
  let targetPath = ".";
  let format = "all";

  for (let i = 0; i < args.length; i++) {
    const argument = args[i];

    if (argument === "--help" || argument === "-h") {
      return {
        help: true,
        targetPath,
        format,
      };
    }

    if (argument === "--format") {
      const selectedFormat = args[i + 1];

      if (!selectedFormat) {
        throw new Error("Missing value after --format.");
      }

      format = selectedFormat;
      i++;
      continue;
    }

    if (!argument.startsWith("--")) {
      targetPath = argument;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  return {
    help: false,
    targetPath,
    format,
  };
}

export function validateFormat(format) {
  const supportedFormats = ["all", "terminal", "json", "html"];

  if (!supportedFormats.includes(format)) {
    throw new Error(
      `Unsupported format "${format}". Use all, terminal, json or html.`,
    );
  }
}

export function performAnalysis(targetPath = ".") {
  const resolvedPath = path.resolve(targetPath);

  const scanResult = analyzeProject(resolvedPath);

  const fileDepMap = {};
  for (const file of scanResult.files.filter((f) => f.isSource)) {
    fileDepMap[file.path] = [];
  }
  for (const dep of scanResult.dependencies) {
    if (!fileDepMap[dep.from]) fileDepMap[dep.from] = [];
    fileDepMap[dep.from].push(dep.to);
  }

  const graphEntries = Object.entries(fileDepMap).map(
    ([source, dependencies]) => ({
      source,
      dependencies,
    }),
  );

  const graphAnalysis = analyzeGraph(graphEntries);

  const gitAnalysis = analyzeChanges(resolvedPath);

  const dependentsMap = {};
  for (const [file, details] of Object.entries(graphAnalysis.files)) {
    dependentsMap[file] = details.inDegree;
  }
  const highImpactFiles = findHighImpactFiles(gitAnalysis, dependentsMap, 1);

  return {
    graph: graphAnalysis,
    git: gitAnalysis,
    highImpactFiles,
  };
}

export function run() {
  try {
    const args = process.argv.slice(2);
    const options = parseArguments(args);

    if (options.help) {
      showHelp();
      return;
    }

    validateFormat(options.format);

    const resolvedPath = path.resolve(options.targetPath);
    const analysisResult = performAnalysis(resolvedPath);

    if (options.format === "json") {
      console.log(formatJsonOutput(analysisResult));
      return;
    }

    if (options.format === "html") {
      const html = formatHtmlOutput(analysisResult);
      const outputPath = path.join(process.cwd(), "codemap-report.html");
      fs.writeFileSync(outputPath, html, "utf8");
      console.log(`CodeMap HTML report generated: ${outputPath}`);
      return;
    }

    if (options.format === "terminal") {
      console.log(formatTerminalOutput(analysisResult));
      return;
    }

    console.log(formatTerminalOutput(analysisResult));
    const html = formatHtmlOutput(analysisResult);
    const outputPath = path.join(process.cwd(), "codemap-report.html");
    fs.writeFileSync(outputPath, html, "utf8");
    console.log(`\nCodeMap HTML report generated: ${outputPath}`);
  } catch (error) {
    console.error(`CodeMap error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  run();
}
