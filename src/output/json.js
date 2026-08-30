function formatJsonOutput(data, pretty = true) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid analysis data.");
  }

  return JSON.stringify(data, null, pretty ? 2 : 0);
}

module.exports = {
  formatJsonOutput,
};