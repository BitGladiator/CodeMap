export const analysisResult = {
  graph: {
    nodeCount: 9,
    edgeCount: 16,
    hasCycles: false,
    cycles: [],

    hotspots: [
      {
        file: "src/database.js",
        dependents: 5,
      },
      {
        file: "src/auth.js",
        dependents: 3,
      },
      {
        file: "src/config.js",
        dependents: 3,
      },
    ],

    files: {
      "src/server.js": {
        dependencies: [
          "src/database.js",
          "src/auth.js",
          "src/config.js",
          "src/routes/auth.js",
          "src/routes/users.js",
        ],
        dependents: [],
        inDegree: 0,
        outDegree: 5,
        depth: 4,
      },

      "src/database.js": {
        dependencies: ["src/config.js"],
        dependents: [
          "src/server.js",
          "src/auth.js",
          "src/user.js",
          "src/routes/auth.js",
          "src/routes/users.js",
        ],
        inDegree: 5,
        outDegree: 1,
        depth: 1,
      },
    },
  },

  git: {
    commitCount: 10,
    filesChanged: 6,
    added: 2,
    modified: 12,
    deleted: 1,

    mostChangedFiles: [
      {
        file: "src/database.js",
        changes: 6,
      },
      {
        file: "src/auth.js",
        changes: 4,
      },
      {
        file: "src/server.js",
        changes: 3,
      },
    ],
  },

  highImpactFiles: [
    {
      file: "src/database.js",
      recentChanges: 6,
      currentDependents: 5,
      note: "Changes to this file may affect 5 other file(s).",
    },
  ],
};

export default analysisResult;