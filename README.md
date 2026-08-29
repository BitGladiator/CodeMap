# Sneha's part — where everything goes

(merge folders, don't replace
anything that isn't listed here).

    src/
      git/
        history.js          <- Git analysis (analyzeChanges, findHighImpactFiles)
    test/
      integration.test.js   <- Integration tests
      fixtures/
        demo-project/       <- Fixture with a deliberate hotspot (database.ts)
                                and a deliberate circular dependency
                                (auth.ts -> user.ts -> database.ts -> auth.ts)

## How to run

    node test/integration.test.js

No install needed for this part — plain Node.js only (no TypeScript,
no ts-node, no third-party packages).

## Locked data shape (tell the team)

findHighImpactFiles() returns objects shaped like:

    { file, recentChanges, currentDependents, note }

## If git commands fail on your machine

If you see something like `spawnSync ... ENOENT` when running the tests,
`git` isn't resolving correctly in child_process on your machine. Run:

    where.exe git

and make sure that path's folder is in your System PATH environment
variable (Settings -> Edit environment variables -> Path -> add the
folder that where.exe printed, e.g. `C:\Program Files\Git\cmd`), then
restart your computer.
