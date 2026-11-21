import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getProviderConfig } from "@/features/ai-provider/store";

// The openai SDK requires a truthy apiKey. Use the provider's config or fall back to the
// OPENAI_API_KEY env var (which local servers accept as-is). We also allow an empty-string
// sentinel that we normalize here so it passes the truthy check while remaining harmless
// for OpenAI-compatible endpoints like LM Studio that don't require API keys.
const DUMMY_KEY = "sk-no-authentication-required";

export async function GET() {
  const config = getProviderConfig();
  try {
    // Build URL-only client first (no credential validation) so we can call list.
    const client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: DUMMY_KEY,  // non-empty sentinel; many local servers accept any string
      dangerouslyAllowBrowser: true,  // bypass browser-origin check in Node env
    });
    const data = await client.models.list();
    return NextResponse.json({ models: data.data.map((m) => ({ id: m.id })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not list models (${message})`, models: [] },
      { status: 503 },
    );
  }
}
