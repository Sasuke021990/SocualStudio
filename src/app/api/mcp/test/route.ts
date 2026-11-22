import { NextResponse } from "next/server";
import { getMcpConfig } from "@/features/mcp-client/store";
import { testServer } from "@/features/mcp-client/registry";
import type { McpServerConfig, McpTransport } from "@/features/mcp-client/types";

/**
 * Connection health check: connects to the server, lists its tools, closes.
 * Body: { id } for a saved server, or { server: McpServerConfig } to test
 * unsaved form input.
 */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, server } = (body ?? {}) as { id?: unknown; server?: unknown };

  let target: McpServerConfig | null = null;
  if (typeof id === "string" && id) {
    const config = await getMcpConfig();
    target = config.servers.find((s) => s.id === id) ?? null;
    if (!target) return NextResponse.json({ error: "Server not found" }, { status: 404 });
  } else if (server && typeof server === "object") {
    target = toServerConfig(server as Record<string, unknown>);
    if (!target) return NextResponse.json({ error: "Invalid server config" }, { status: 400 });
  } else {
    return NextResponse.json({ error: "id or server required" }, { status: 400 });
  }

  const report = await testServer(target);
  return NextResponse.json(report);
}

function toServerConfig(raw: Record<string, unknown>): McpServerConfig | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const transport: McpTransport | null = raw.transport === "stdio" || raw.transport === "http" ? raw.transport : null;
  if (!name || !transport) return null;
  if (transport === "stdio" && typeof raw.command !== "string") return null;
  if (transport === "http" && typeof raw.url !== "string") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "unsaved",
    name,
    transport,
    command: typeof raw.command === "string" ? raw.command : undefined,
    args: Array.isArray(raw.args) ? (raw.args as string[]) : undefined,
    env: (raw.env as Record<string, string> | undefined) ?? undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    headers: (raw.headers as Record<string, string> | undefined) ?? undefined,
    enabled: true,
  };
}
