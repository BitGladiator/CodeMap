const analysisResult = require("./fixtures/analysis-result");

const {
  formatJsonOutput,
} = require("../src/output/json");

console.log(formatJsonOutput(analysisResult));