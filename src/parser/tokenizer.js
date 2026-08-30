export function getImports(code) {
  const imports = [];

  const importPattern =
    /import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

  const requirePattern =
    /require\s*\(\s*["']([^"']+)["']\s*\)/g;

  let match;

  while ((match = importPattern.exec(code)) !== null) {
    imports.push(match[1]);
  }

  while ((match = requirePattern.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}