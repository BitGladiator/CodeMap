import fs from "fs";
import path from "path";
import { getImports } from "./tokenizer.js";

const extensions = [".js", ".jsx", ".ts", ".tsx"];

export function resolveImport(filePath, importPath) {
  if (!importPath.startsWith(".")) {
    return null;
  }

  const basePath = path.resolve(
    path.dirname(filePath),
    importPath
  );

  try {
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath;
    }
  } catch {
  }

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

export function getDependencies(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  return getImports(code);
}