import fs from "fs";
import path from "path";

const ignoredFolders = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  "out",
  ".cache",
  ".turbo",
  "vendor",
  ".parcel-cache"
];
const extensions = [".js", ".jsx", ".ts", ".tsx"];

export function scanDirectory(folder) {
  const files = [];

  function scan(currentFolder) {
    const items = fs.readdirSync(currentFolder, {
      withFileTypes: true
    });

    for (const item of items) {
      if (ignoredFolders.includes(item.name)) {
        continue;
      }

      const fullPath = path.join(currentFolder, item.name);

      if (item.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = path.extname(item.name).toLowerCase();

        files.push({
          path: path.relative(folder, fullPath),
          extension: ext,
          isSource: extensions.includes(ext),
          isTest: /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(item.name)
        });
      }
    }
  }

  scan(folder);
  return files;
}