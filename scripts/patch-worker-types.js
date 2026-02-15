// Post-process worker-configuration.d.ts to avoid TypeScript following
// the import chain from workers/app.ts into the RSC entry's .tsx source,
// which uses virtual modules that only resolve at Vite build time.

import {readFileSync, writeFileSync} from "node:fs";

const file = "worker-configuration.d.ts";
let content = readFileSync(file, "utf-8");

// Replace `typeof import("./workers/app")` with `unknown` in GlobalProps
// since it's not needed for type-checking app code.
content = content.replace(
    /mainModule:\s*typeof import\("\.\/workers\/app"\);/,
    "mainModule: unknown;"
);

// Replace `import("./workers/app").ProjectDO` with direct import from project-do
content = content.replace(
    /import\("\.\/workers\/app"\)\.ProjectDO/g,
    'import("./workers/project-do").ProjectDO'
);

writeFileSync(file, content);
