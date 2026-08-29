const path = require("path");
const { scanDirectory } = require("./files");
const {
  getDependencies,
  resolveImport
} = require("../parser/imports");

function analyzeProject(projectPath) {
  const root = path.resolve(projectPath);
  const files = scanDirectory(root);

  const sourceFiles = files.filter(
    (file) => file.isSource
  );

  const dependencies = [];

  for (const file of sourceFiles) {
    const fullPath = path.join(root, file.path);
    const imports = getDependencies(fullPath);

    for (const importPath of imports) {
      const resolved = resolveImport(fullPath, importPath);

      if (resolved) {
        dependencies.push({
          from: file.path,
          to: path.relative(root, resolved)
        });
      }
    }
  }

  return {
    files,
    dependencies
  };
}

module.exports = { analyzeProject };