import { NextResponse } from "next/server";
import { getMcpConfig, saveMcpConfig } from "@/features/mcp-client/store";
import { mcpServerInputSchema, mcpServerObjectSchema, mcpStagesSchema } from "@/features/mcp-client/schemas";
import type { McpServerConfig } from "@/features/mcp-client/types";

export async function GET() {
  const config = await getMcpConfig();
  return NextResponse.json(config);
}

/** Create a server connection */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = mcpServerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid MCP server config", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const config = await getMcpConfig();
  const server: McpServerConfig = { ...parsed.data, id: crypto.randomUUID(), enabled: parsed.data.enabled ?? true };
  config.servers.push(server);
  await saveMcpConfig(config);
  return NextResponse.json({ server });
}

/** Update a server ({ id, …fields }) or stage toggles ({ stages }) */
export async function PATCH(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;

  if ("stages" in record) {
    const parsed = mcpStagesSchema.safeParse(record.stages);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid stage toggles", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const config = await getMcpConfig();
    config.stages = parsed.data;
    await saveMcpConfig(config);
    return NextResponse.json(config);
  }

  const { id, ...updates } = record;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  // zod v4: `.partial()` cannot wrap the refined create schema — validate the
  // shape loosely here, then the fully-merged server below.
  const parsed = mcpServerObjectSchema.partial().safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid MCP server config", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const config = await getMcpConfig();
  const existing = config.servers.find((s) => s.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  const merged = { ...existing, ...parsed.data } as McpServerConfig;
  const mergedCheck = mcpServerInputSchema.safeParse(merged);
  if (!mergedCheck.success) {
    return NextResponse.json(
      { error: "Invalid MCP server config", details: mergedCheck.error.issues },
      { status: 400 },
    );
  }
  Object.assign(existing, mergedCheck.data);
  await saveMcpConfig(config);
  return NextResponse.json({ server: existing });
}

/** Delete a server */
export async function DELETE(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const config = await getMcpConfig();
  const before = config.servers.length;
  config.servers = config.servers.filter((s) => s.id !== id);
  if (config.servers.length === before) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  await saveMcpConfig(config);
  return NextResponse.json({ ok: true });
}
