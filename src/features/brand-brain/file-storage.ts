import { mkdir, readFile, readdir, rm, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const BRANDS_DIR = join(process.cwd(), "data", "brands");

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 64) || "unnamed-brand";
}

function brandDir(brainId: string): string {
  return join(BRANDS_DIR, sanitizeName(brainId));
}

export async function saveBrandBrainFile(
  brainId: string,
  brandName: string,
  markdown: string,
): Promise<{ path: string; fileName: string }> {
  const dir = brandDir(brainId);
  await mkdir(dir, { recursive: true });
  const fileName = `${sanitizeName(brandName)}.md`;
  const filePath = join(dir, fileName);
  await writeFile(filePath, markdown, "utf-8");
  return { path: filePath, fileName };
}

export async function loadBrandBrainFile(
  brainId: string,
  brandName: string,
): Promise<string | null> {
  const dir = brandDir(brainId);
  const filePath = join(dir, `${sanitizeName(brandName)}.md`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listBrandBrainFiles(
  brainId: string,
): Promise<Array<{ name: string; path: string; size: number; modifiedAt: string }>> {
  const dir = brandDir(brainId);
  try {
    const entries = await readdir(dir);
    const files = await Promise.all(
      entries
        .filter((e) => e.endsWith(".md"))
        .map(async (name) => {
          const filePath = join(dir, name);
          const st = await stat(filePath);
          return {
            name: name.replace(/\.md$/, ""),
            path: filePath,
            size: st.size,
            modifiedAt: st.mtime.toISOString(),
          };
        }),
    );
    return files;
  } catch {
    return [];
  }
}

export interface ProjectEntry {
  brainId: string;
  brandName: string;
  fileName: string;
  filePath: string;
  size: number;
  modifiedAt: string;
  heading: string;
}

/** List all brand projects across all brain directories. */
export async function listAllProjects(): Promise<ProjectEntry[]> {
  const projects: ProjectEntry[] = [];
  try {
    const brainDirs = await readdir(BRANDS_DIR, { withFileTypes: true });
    for (const brainEntry of brainDirs) {
      if (!brainEntry.isDirectory()) continue;
      const brainPath = join(BRANDS_DIR, brainEntry.name);
      const files = await readdir(brainPath);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const filePath = join(brainPath, file);
        const st = await stat(filePath);
        const raw = await readFile(filePath, "utf-8").catch(() => "");
        const heading = /^#\s+(.+)$/m.exec(raw)?.[1]?.trim() ?? file.replace(/\.md$/, "");
        projects.push({
          brainId: brainEntry.name,
          brandName: file.replace(/\.md$/, ""),
          fileName: file,
          filePath,
          size: st.size,
          modifiedAt: st.mtime.toISOString(),
          heading,
        });
      }
    }
  } catch {
    // data/brands doesn't exist yet — return empty
  }
  return projects.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/** Removes the brand folder (all .md profiles) for a brainId. */
export async function deleteBrandBrainDir(brainId: string): Promise<boolean> {
  const dir = brandDir(brainId);
  try {
    await stat(dir);
  } catch {
    return false;
  }
  await rm(dir, { recursive: true, force: true });
  return true;
}

export async function brandBrainFileExists(
  brainId: string,
  brandName: string,
): Promise<boolean> {
  const dir = brandDir(brainId);
  const filePath = join(dir, `${sanitizeName(brandName)}.md`);
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
