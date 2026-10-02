// Emits the per-directory package.json markers Node needs to resolve the
// dual ESM/CJS build correctly.
import { writeFile } from "node:fs/promises";

await writeFile("dist/cjs/package.json", JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
await writeFile("dist/esm/package.json", JSON.stringify({ type: "module" }, null, 2) + "\n");

console.log("dual build markers written");
