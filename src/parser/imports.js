const fs = require("fs");
const path = require("path");
const { getImports } = require("./tokenizer");

const extensions = [".js", ".jsx", ".ts", ".tsx"];

function resolveImport(filePath, importPath) {
  if (!importPath.startsWith(".")) {
    return null;
  }

  const basePath = path.resolve(
    path.dirname(filePath),
    importPath
  );

  for (const ext of extensions) {
    const file = basePath + ext;

    if (fs.existsSync(file)) {
      return file;
    }
  }

  for (const ext of extensions) {
    const file = path.join(basePath, "index" + ext);

    if (fs.existsSync(file)) {
      return file;
    }
  }

  return null;
}

function getDependencies(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  return getImports(code);
}

module.exports = {
  resolveImport,
  getDependencies
};