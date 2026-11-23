import OpenAI from "openai";
import type { ProviderConfig } from "./types";

/**
 * Warm the local model back into VRAM after GPU-heavy work (e.g. ComfyUI image
 * generation) unloads it. Fire-and-forget: never throws, never blocks callers.
 */
export async function preloadLocalModel(config: ProviderConfig): Promise<void> {
  try {
    const baseUrl = config.baseUrl || "http://127.0.0.1:1235/v1";
    const client = new OpenAI({ baseURL: baseUrl, apiKey: config.apiKey ?? "sk-no-authenticated-key", timeout: 600_000 });
    await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 4,
    });
  } catch {
    // best-effort — the next real request will load the model anyway
  }
}
