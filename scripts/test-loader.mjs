// Lets Node's built-in test runner resolve this project's extensionless
// relative TypeScript imports (e.g. `import { x } from "./store"`) and its
// "@/*" -> "./src/*" path alias, both of which Next.js's bundler resolves
// but Node's native ESM loader does not. Used only for `node:test` runs —
// not a bundler, not a new test framework.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const EXTS = [".ts", ".tsx", ".js", ".mjs"];
const PROJECT_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

function resolveWithExts(baseDir, specifierPath) {
  for (const ext of EXTS) {
    const candidate = resolvePath(baseDir, specifierPath + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const hasExt = EXTS.some((ext) => specifier.endsWith(ext));

  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const candidate = hasExt
      ? resolvePath(PROJECT_ROOT, "src", rel)
      : resolveWithExts(resolvePath(PROJECT_ROOT, "src"), rel);
    if (candidate && existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  if (specifier.startsWith(".") && !hasExt) {
    const baseDir = dirname(fileURLToPath(context.parentURL));
    const candidate = resolveWithExts(baseDir, specifier);
    if (candidate) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  return nextResolve(specifier, context);
}
