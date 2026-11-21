import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceConfig, saveWorkspaceConfig } from "@/features/workspace-config/store";
import { mkdir } from "node:fs/promises";

export async function GET() {
  return NextResponse.json({ config: await getWorkspaceConfig() });
}

const saveSchema = z.object({
  exportPath: z.string().min(1, "Workspace path required"),
});

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
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  // Verify/create the directory to fail fast on bad paths
  try {
    await mkdir(parsed.data.exportPath, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Cannot create or access that folder path" }, { status: 400 });
  }

  const config = await saveWorkspaceConfig(parsed.data);
  return NextResponse.json({ config });
}
