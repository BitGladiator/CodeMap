const fs = require("fs");
const path = require("path");

const { formatTerminalOutput } = require("./output/terminal");

const { formatJsonOutput } = require("./output/json");

const { formatHtmlOutput } = require("./output/html");

function showHelp() {
  console.log(`
CodeMap - Repository Architecture & Change Analyser

Usage:
  node src/cli.js [path] [options]

Options:
  --format terminal    Display a readable terminal report
  --format json        Display analysis as JSON
  --format html        Generate a standalone HTML report
  --help               Show this help message

Examples:
  node src/cli.js .
  node src/cli.js . --format terminal
  node src/cli.js . --format json
  node src/cli.js . --format html
`);
}

function parseArguments(args) {
  let targetPath = ".";
  let format = "terminal";

  for (let i = 0; i < args.length; i++) {
    const argument = args[i];

    if (argument === "--help") {
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

function validateFormat(format) {
  const supportedFormats = ["terminal", "json", "html"];

  if (!supportedFormats.includes(format)) {
    throw new Error(
      `Unsupported format "${format}". Use terminal, json or html.`,
    );
  }
}

function run() {
  try {
    const args = process.argv.slice(2);

    const options = parseArguments(args);

    if (options.help) {
      showHelp();
      return;
    }

    validateFormat(options.format);

    const resolvedPath = path.resolve(options.targetPath);

    /*
     * TEMPORARY:
     * Fixture data until the parser,
     * graph and Git modules are integrated.
     */
    const analysisResult = require("../test/fixtures/analysis-result");

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

    console.log(formatTerminalOutput(analysisResult));
  } catch (error) {
    console.error(`CodeMap error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  parseArguments,
  validateFormat,
  run,
};
