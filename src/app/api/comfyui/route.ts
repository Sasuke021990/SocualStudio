import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getComfyUIState,
  addConnection,
  setActiveConnection,
  removeConnection,
  updateConnectionStatus,
} from "@/features/comfyui/store";

export async function GET() {
  const state = await getComfyUIState();
  return NextResponse.json(state);
}

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Connection name required"),
  baseUrl: z.string().url("Valid ComfyUI URL required"),
  workflowName: z.string().nullable().optional(),
  workflowJson: z.record(z.string(), z.unknown()).nullable().optional(),
});

/** Add or update a connection */
export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid ComfyUI connection", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const connection = await addConnection(parsed.data);
  return NextResponse.json({ connection });
}

const activateSchema = z.object({ activeId: z.string().min(1) });

/** Set the active connection */
export async function PATCH(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "activeId required" }, { status: 400 });
  }

  const connection = await setActiveConnection(parsed.data.activeId);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  return NextResponse.json({ connection });
}

const testSchema = z.object({
  id: z.string().min(1),
  baseUrl: z.string().url(),
});

/** Test connection to a ComfyUI server */
export async function PUT(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "id and valid URL required" }, { status: 400 });
  }

  const { id, baseUrl } = parsed.data;
  const cleanUrl = baseUrl.replace(/\/+$/, "");

  try {
    const res = await fetch(`${cleanUrl}/system_stats`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      await updateConnectionStatus(id, false);
      return NextResponse.json({
        ok: false,
        message: `ComfyUI responded with status ${res.status}`,
      });
    }
    const stats = await res.json() as { system?: { comfyui_version?: string } };
    const version = stats.system?.comfyui_version;
    await updateConnectionStatus(id, true);
    return NextResponse.json({
      ok: true,
      message: `Connected to ComfyUI${version ? ` v${version}` : ""}`,
      version,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    await updateConnectionStatus(id, false);
    return NextResponse.json({
      ok: false,
      message: `Cannot reach ComfyUI at ${cleanUrl} — ${msg}. Make sure ComfyUI is running with --enable-cors-header.`,
    });
  }
}

/** Remove a connection */
export async function DELETE(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = z.object({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const removed = await removeConnection(parsed.data.id);
  if (!removed) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
