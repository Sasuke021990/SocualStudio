// Lets Node's built-in test runner resolve this project's extensionless
// relative TypeScript imports (e.g. `import { x } from "./store"`), which
// Next.js's own bundler resolves but Node's native ESM loader does not.
// Used only for `node:test` runs — not a bundler, not a new test framework.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const EXTS = [".ts", ".tsx", ".js", ".mjs"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !EXTS.some((ext) => specifier.endsWith(ext))) {
    const baseDir = dirname(fileURLToPath(context.parentURL));
    for (const ext of EXTS) {
      const candidate = resolvePath(baseDir, specifier + ext);
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
