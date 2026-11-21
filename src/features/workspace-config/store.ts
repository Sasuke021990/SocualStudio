import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const CONFIG_PATH = join(DATA_DIR, "workspace.json");

export interface WorkspaceConfig {
  exportPath: string;
}

const DEFAULT: WorkspaceConfig = {
  exportPath: join(process.cwd(), "exports"),
};

let config: WorkspaceConfig | null = null;

async function loadFromDisk(): Promise<WorkspaceConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as WorkspaceConfig;
  } catch {
    return { ...DEFAULT };
  }
}

export async function getWorkspaceConfig(): Promise<WorkspaceConfig> {
  if (!config) config = await loadFromDisk();
  return { ...config };
}

export async function saveWorkspaceConfig(input: { exportPath: string }): Promise<WorkspaceConfig> {
  config = { exportPath: input.exportPath || DEFAULT.exportPath };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  return { ...config };
}
