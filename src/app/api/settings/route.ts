import { NextResponse } from "next/server";
import { getProviderConfig, saveProviderConfig } from "@/features/ai-provider/store";
import { providerConfigSchema } from "@/features/ai-provider/schemas";

export async function GET() {
  return NextResponse.json({ provider: getProviderConfig() });
}

export async function PUT(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = providerConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid provider configuration", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const provider = saveProviderConfig(parsed.data);
  return NextResponse.json({ provider });
}
