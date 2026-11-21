import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ComfyUIConnection, ComfyUIState } from "./types";

const DATA_DIR = join(process.cwd(), "data", "comfyui");
const STATE_PATH = join(DATA_DIR, "connections.json");

const EMPTY_STATE: ComfyUIState = { connections: [], activeId: null };

let state: ComfyUIState | null = null;

async function loadFromDisk(): Promise<ComfyUIState> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as ComfyUIState;
  } catch {
    return { ...EMPTY_STATE, connections: [] };
  }
}

async function persist(next: ComfyUIState): Promise<void> {
  state = next;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(next, null, 2), "utf-8");
}

export async function getComfyUIState(): Promise<ComfyUIState> {
  if (!state) state = await loadFromDisk();
  return JSON.parse(JSON.stringify(state)) as ComfyUIState;
}

export async function getActiveConnection(): Promise<ComfyUIConnection | null> {
  const s = await getComfyUIState();
  return s.connections.find((c) => c.id === s.activeId) ?? null;
}

export async function addConnection(input: {
  id?: string;
  name: string;
  baseUrl: string;
  workflowName?: string | null;
  workflowJson?: Record<string, unknown> | null;
}): Promise<ComfyUIConnection> {
  const s = state ?? (await loadFromDisk());
  const id = input.id ?? crypto.randomUUID();
  const existingIdx = s.connections.findIndex((c) => c.id === id);
  const connection: ComfyUIConnection = {
    id,
    name: input.name,
    baseUrl: input.baseUrl,
    connected: false,
    workflowName: input.workflowName ?? s.connections[existingIdx]?.workflowName ?? null,
    workflowJson: input.workflowJson ?? s.connections[existingIdx]?.workflowJson ?? null,
    lastTestedAt: new Date().toISOString(),
  };
  const connections = existingIdx >= 0
    ? s.connections.map((c, i) => (i === existingIdx ? connection : c))
    : [...s.connections, connection];
  const activeId = s.activeId ?? id;
  await persist({ connections, activeId });
  return { ...connection };
}

export async function setActiveConnection(id: string): Promise<ComfyUIConnection | null> {
  const s = state ?? (await loadFromDisk());
  const target = s.connections.find((c) => c.id === id);
  if (!target) return null;
  await persist({ ...s, activeId: id });
  return { ...target };
}

export async function removeConnection(id: string): Promise<boolean> {
  const s = state ?? (await loadFromDisk());
  const before = s.connections.length;
  const connections = s.connections.filter((c) => c.id !== id);
  if (connections.length === before) return false;
  const activeId = s.activeId === id ? (connections[0]?.id ?? null) : s.activeId;
  await persist({ connections, activeId });
  return true;
}

export async function updateConnectionStatus(id: string, connected: boolean): Promise<void> {
  const s = state ?? (await loadFromDisk());
  const connections = s.connections.map((c) =>
    c.id === id ? { ...c, connected, lastTestedAt: new Date().toISOString() } : c,
  );
  await persist({ ...s, connections });
}
