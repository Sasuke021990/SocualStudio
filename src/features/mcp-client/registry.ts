import { getMcpConfig } from "./store";
import { withMcpConnection } from "./client";
import type { McpServerConfig, McpStage } from "./types";

const MAX_RESULT_CHARS = 4096;

export interface McpToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface McpToolset {
  tools: McpToolSchema[];
  /** Executes `servername__toolname`. Returns `[tool error] …` strings on failure (D7). */
  execute(name: string, args: unknown): Promise<string>;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "server";
}

export function toolNameFor(server: McpServerConfig, tool: string): string {
  return `${slug(server.name)}__${tool}`;
}

function truncate(text: string): string {
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}…[truncated]` : text;
}

/**
 * A tool's real inputSchema, or an empty object schema when the server
 * didn't provide one. Previously this was hardcoded to the empty schema
 * for every tool, discarding whatever the server actually sent.
 */
export function toolParameters(inputSchema: unknown): Record<string, unknown> {
  if (inputSchema && typeof inputSchema === "object") {
    return inputSchema as Record<string, unknown>;
  }
  return { type: "object", properties: {} };
}

/**
 * Collect OpenAI-format tool schemas from all enabled servers allowed for
 * `stage`. Pass `{ ignoreStage: true }` to force acquisition regardless of the
 * global stage switch (per-run override). Returns null when nothing is
 * available so callers can skip the `tools` param entirely (zero overhead).
 */
export async function acquireToolset(
  stage: McpStage,
  opts?: { ignoreStage?: boolean },
): Promise<McpToolset | null> {
  const config = await getMcpConfig();
  if (!opts?.ignoreStage && !config.stages[stage]) return null;
  const servers = config.servers.filter((s) => s.enabled);
  if (servers.length === 0) return null;

  const byTool = new Map<string, { server: McpServerConfig; toolName: string }>();
  const tools: McpToolSchema[] = [];

  for (const server of servers) {
    try {
      const listed = await withMcpConnection(server, (conn) => conn.listTools());
      for (const tool of listed) {
        const name = toolNameFor(server, tool.name);
        byTool.set(name, { server, toolName: tool.name });
        tools.push({
          type: "function",
          function: {
            name,
            description: `[${server.name}] ${tool.description}`.trim(),
            parameters: toolParameters(tool.inputSchema),
          },
        });
      }
    } catch (err) {
      // Unreachable/broken server: omit its tools, never block generation.
      console.warn(`[mcp] listing tools failed for "${server.name}":`, err instanceof Error ? err.message : err);
    }
  }

  if (tools.length === 0) return null;

  return {
    tools,
    async execute(name, args) {
      const entry = byTool.get(name);
      if (!entry) return "[tool error] unknown tool";
      try {
        const result = await withMcpConnection(entry.server, (conn) =>
          conn.callTool(entry.toolName, args),
        );
        return truncate(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return truncate(`[tool error] ${message}`);
      }
    },
  };
}

/** Test connection + list tools for one server (Settings UI health check). */
export async function testServer(server: McpServerConfig): Promise<{
  ok: boolean;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
  error?: string;
}> {
  try {
    const tools = await withMcpConnection(server, (conn) => conn.listTools());
    return { ok: true, toolCount: tools.length, tools };
  } catch (err) {
    return {
      ok: false,
      toolCount: 0,
      tools: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
