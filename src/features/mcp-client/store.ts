import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EMPTY_MCP_CONFIG, type McpConfig } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const CONFIG_PATH = join(DATA_DIR, "mcp.json");

let config: McpConfig | null = null;

async function loadFromDisk(): Promise<McpConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<McpConfig>;
    return {
      servers: Array.isArray(parsed.servers) ? parsed.servers : [],
      stages: { ...EMPTY_MCP_CONFIG.stages, ...(parsed.stages ?? {}) },
    };
  } catch {
    return structuredClone(EMPTY_MCP_CONFIG);
  }
}

export async function getMcpConfig(): Promise<McpConfig> {
  if (!config) config = await loadFromDisk();
  return structuredClone(config);
}

export async function saveMcpConfig(next: McpConfig): Promise<McpConfig> {
  config = structuredClone(next);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  return structuredClone(config);
}
