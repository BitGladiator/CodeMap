import test from "node:test";
import assert from "node:assert/strict";

import { analysisResult } from "./fixtures/analysis-result.js";
import { formatTerminalOutput } from "../src/output/terminal.js";
import { formatJsonOutput } from "../src/output/json.js";
import { formatHtmlOutput } from "../src/output/html.js";

test("terminal output contains project summary", () => {
  const output = formatTerminalOutput(analysisResult);

  assert.match(output, /CODEMAP/);
  assert.match(output, /PROJECT SUMMARY/);
  assert.match(output, /Files:\s+9/);
});

test("json output is valid JSON", () => {
  const output = formatJsonOutput(analysisResult);

  const parsed = JSON.parse(output);

  assert.equal(parsed.graph.nodeCount, 9);
  assert.equal(parsed.graph.edgeCount, 16);
});

test("html output contains report sections", () => {
  const output = formatHtmlOutput(analysisResult);

  assert.match(output, /<!DOCTYPE html>/);
  assert.match(output, /Dependency Graph/);
  assert.match(output, /Hotspots/);
  assert.match(output, /Recent Changes/);
});