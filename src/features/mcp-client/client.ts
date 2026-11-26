import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./types";

// Renders/exports can run for minutes; ordinary calls return in milliseconds.
const TOOL_TIMEOUT_MS = 600_000;
const CONNECT_TIMEOUT_MS = 15_000;

export interface McpConnection {
  listTools(): Promise<Array<{ name: string; description: string; inputSchema?: unknown }>>;
  callTool(name: string, args: unknown): Promise<string>;
  close(): Promise<void>;
}

function createTransport(server: McpServerConfig) {
  if (server.transport === "stdio") {
    return new StdioClientTransport({
      command: server.command ?? "",
      args: server.args ?? [],
      env: server.env as Record<string, string> | undefined,
    });
  }
  return new StreamableHTTPClientTransport(new URL(server.url ?? ""), {
    requestInit: server.headers ? { headers: server.headers } : undefined,
  });
}

export async function connect(server: McpServerConfig): Promise<McpConnection> {
  const client = new Client({ name: "social-studio", version: "1.0.0" });
  const transport = createTransport(server);

  // A dead or misconfigured process (e.g. node spawned without a script) can
  // leave the initialize handshake pending forever — never hang the caller.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s`)), CONNECT_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    client.close().catch(() => {});
    throw err;
  } finally {
    clearTimeout(timer);
  }

  return {
    async listTools() {
      const res = await client.listTools(undefined, { timeout: TOOL_TIMEOUT_MS });
      return (res.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema,
      }));
    },
    async callTool(name, args) {
      const res = await client.callTool(
        { name, arguments: args as Record<string, unknown> },
        undefined,
        { timeout: TOOL_TIMEOUT_MS },
      );
      const content = (res.content ?? []) as Array<{ type: string; text?: string }>;
      const text = content
        .map((part) => (part.type === "text" ? (part.text ?? "") : JSON.stringify(part)))
        .join("\n");
      return text || JSON.stringify(res);
    },
    async close() {
      await client.close().catch(() => {});
    },
  };
}

interface PoolEntry {
  conn: Promise<McpConnection>;
  refs: number;
}

const pool = new Map<string, PoolEntry>();

/**
 * Borrow a shared connection for one unit of work (lazy lifecycle, D5):
 * connects on first use, closes when the last borrower releases.
 */
export async function withMcpConnection<T>(
  server: McpServerConfig,
  fn: (conn: McpConnection) => Promise<T>,
): Promise<T> {
  let entry = pool.get(server.id);
  if (!entry) {
    entry = { conn: connect(server), refs: 0 };
    pool.set(server.id, entry);
  }
  entry.refs += 1;
  try {
    const conn = await entry.conn;
    return await fn(conn);
  } finally {
    const current = pool.get(server.id);
    if (current) {
      current.refs -= 1;
      if (current.refs <= 0) {
        pool.delete(server.id);
        current.conn.then((c) => c.close()).catch(() => {});
      }
    }
  }
}
