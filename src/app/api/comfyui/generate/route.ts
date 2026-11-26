import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveConnection, getComfyUIState } from "@/features/comfyui/store";
import { getProviderConfig } from "@/features/ai-provider/store";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { generateComfyImages } from "@/features/comfyui/generate";
import { autoFreeVram } from "@/features/vram";
import { DEFAULT_NO_TEXT_NEGATIVE_PROMPT } from "@/features/content-dashboard/variations";

const generateSchema = z.object({
  prompt: z.string().min(1, "Image prompt required"),
  negativePrompt: z.string().optional(),
  /** Target output size — omitted = the workflow's own dimensions. */
  width: z.number().min(64).max(2048).optional(),
  height: z.number().min(64).max(2048).optional(),
  connectionId: z.string().optional(),
});

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  // Use requested connection if given, otherwise the active one
  const connection = parsed.data.connectionId
    ? (await getComfyUIState()).connections.find((c) => c.id === parsed.data.connectionId) ?? null
    : await getActiveConnection();
  if (!connection?.workflowJson) {
    return NextResponse.json(
      { error: "No active ComfyUI connection with workflow. Add one in Step 1 and set it active." },
      { status: 400 },
    );
  }

  // Free VRAM first: unload the locally loaded LLM (LM Studio / Ollama) before
  // handing the GPU to ComfyUI. Best-effort — never blocks image generation.
  const providerConfig = getProviderConfig();
  const unloadResult = await unloadLocalModel(providerConfig);

  try {
    const size =
      parsed.data.width && parsed.data.height
        ? { width: parsed.data.width, height: parsed.data.height }
        : undefined;
    const effectiveNegativePrompt = parsed.data.negativePrompt?.trim()
      ? `${parsed.data.negativePrompt.trim()}, ${DEFAULT_NO_TEXT_NEGATIVE_PROMPT}`
      : DEFAULT_NO_TEXT_NEGATIVE_PROMPT;
    const images = await generateComfyImages(connection, parsed.data.prompt, effectiveNegativePrompt, size);
    // Proxy through our API to avoid browser CORS issues with ComfyUI /view
    const proxied = images.map((img) => ({
      ...img,
      url: `/api/comfyui/image?url=${encodeURIComponent(img.viewUrl)}`,
    }));
    return NextResponse.json({ images: proxied, unload: unloadResult });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    const status = /timed out/i.test(msg) ? 504 : /rejected|no ComfyUI|workflow/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  } finally {
    // Automatically free ComfyUI models & VRAM once image generation completes
    await autoFreeVram({ target: "comfyui" });
  }
}
