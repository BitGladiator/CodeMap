import { analysisResult } from "./fixtures/analysis-result.js";
import { formatJsonOutput } from "../src/output/json.js";

console.log(formatJsonOutput(analysisResult));