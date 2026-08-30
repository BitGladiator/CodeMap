const analysisResult = require("./fixtures/analysis-result");

const {
  formatTerminalOutput,
} = require("../src/output/terminal");

console.log(formatTerminalOutput(analysisResult));