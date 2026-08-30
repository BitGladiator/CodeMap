# CodeMap 🗺️
### Repository Architecture & Change Analyzer

CodeMap is a lightweight, zero-dependency repository intelligence tool and web application. It parses JavaScript/TypeScript source code to build a comprehensive dependency graph, identifies architectural hotspots and circular dependencies, correlates structural coupling with Git change churn, and generates interactive visual reports.

---

## ⚡ Key Features

- **Dependency Graph Construction**: Extracts imports/requires across files and builds an in-memory dependency graph.
- **Architectural Hotspots**: Pinpoints the most depended-upon files (high in-degree) that pose architectural risk when modified.
- **Circular Dependency Detection**: Detects dependency loops and recursion cycles.
- **Git Churn Correlation**: Combines commit history (additions, modifications, deletions, file changes) with graph centrality to identify **High Impact Files**.
- **Interactive Web Interface**: Clean, modern vanilla web application with live SVG dependency graph visualization, metrics cards, and report exports.
- **Standalone HTML & JSON Reports**: Export complete offline visual dashboards.
- **Zero Third-Party Dependencies**: Built **100% with native Node.js built-ins** (`http`, `fs`, `path`, `child_process`, `os`, `crypto`, `url`, `node:test`, `node:assert`).

---

## 🏗️ Architecture

```text
Browser / CLI
    │
    ▼
Node.js HTTP Server (src/server.js)
    │
    ▼
POST /api/analyze
    │
    ├── 1. Shallow Git Clone (temp dir via git clone --depth 15)
    │
    ├── 2. Scanner (src/scanner/): Traverses source files
    │
    ├── 3. Parser (src/parser/): Extracts ES Module & CommonJS imports
    │
    ├── 4. Dependency Graph (src/graph/): Computes in/out degrees, depth, hotspots
    │
    ├── 5. Cycle Detection (src/graph/cycles.js): Finds circular dependency loops
    │
    ├── 6. Git Analysis (src/git/history.js): Extracts commit frequency & churn
    │
    ├── 7. High Impact Correlator: Matches high churn against high dependents
    │
    ├── 8. Output Formatters (src/output/): Terminal dashboard, HTML report, JSON
    │
    └── 9. Cleanup: Automatically deletes temporary cloned files in finally block
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on Node v20+)
- **Git**: Installed and accessible in your system `PATH`

### Installation
No package installations or `npm install` steps are required! CodeMap has **zero third-party dependencies**.

```bash
# Clone this repository
git clone https://github.com/username/CodeMap.git
cd CodeMap
```

---

## 🖥️ Running the Web Application

To start the local web server:

```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

### Analyzing a GitHub Repository via the Web UI:
1. Enter any public GitHub repository URL (e.g. `https://github.com/expressjs/express`).
2. Click **Analyze**.
3. CodeMap will shallow-clone the repository to a temporary workspace, parse its architecture, calculate Git churn, render the interactive SVG graph, and immediately clean up the temporary directory.
4. Click **Download HTML Report** to save a standalone offline visual report, or **Toggle JSON** to inspect the raw data.

---

## 💻 CLI Usage

You can also run CodeMap directly from the terminal against any local folder or project:

```bash
# Full analysis: terminal report + codemap-report.html generation
npm run cli

# Analyze a specific directory
npm run cli -- test/fixtures/demo-project

# Terminal-only output
npm run report:terminal

# HTML report generation only
npm run report:html

# JSON output
npm run report:json
```

---

## 🧪 Automated Testing

CodeMap uses Node.js native test runner (`node:test` and `node:assert`). All tests run without external test frameworks.

```bash
npm test
```

### Test Coverage Includes:
- **Graph & Cycle Detection**: Linear chains, circular graphs, self-cycles, disconnected nodes, isolated components.
- **Graph Metrics**: In-degree, out-degree, dependency depth calculation.
- **Git History Parsing**: Commit counting, rename detection, space/unicode filenames, deleted-then-recreated files.
- **Output Formatters**: Terminal formatting, JSON serialization, HTML generation with SVG.
- **Web Server & API**: `/health` endpoint, static file serving, URL validation, fixture analysis, and temporary folder cleanup guarantees.

---

## 🔒 Security & Sandboxing

1. **Strict URL Validation**: Only HTTPS GitHub repository URLs matching `https://github.com/owner/repo` are accepted. Arbitrary shell arguments or malicious strings are rejected immediately.
2. **Ephemeral Clones**: Cloned repositories reside in temporary directories with random UUID prefixes in `os.tmpdir()` and are deleted in a `finally` block even if analysis fails.
3. **No Code Execution**: CodeMap statically analyzes source code using regular expressions and AST tokenization. User code is **never** executed or evaluated.
4. **Traversal Prevention**: Static file serving enforces strict root directory boundaries to prevent directory traversal attacks.

---

## 🚢 Deployment

Because CodeMap requires zero `npm install` steps, deploying is instantaneous on any Node.js hosting platform:

```bash
# Set environment PORT if needed (default: 3000)
PORT=8080 npm start
```

### Docker (Optional)
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📦 Zero Third-Party Dependencies

Verified in `package.json`:
- `dependencies`: **0**
- `devDependencies`: **0**
- Only built-in Node.js standard modules used (`http`, `fs`, `path`, `child_process`, `os`, `crypto`, `url`, `node:test`, `node:assert`).
