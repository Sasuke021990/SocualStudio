import { NextResponse } from "next/server";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { aiGenerateRequestSchema } from "@/features/ai-provider/schemas";
import type { ProviderConfig } from "@/features/ai-provider/types";

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const config: ProviderConfig = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const encoder = new TextEncoder();
  const stream = provider.streamChat({ config, messages: parsed.data.messages });

  const response = new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown AI streaming error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message } })}\n\n`));
        } finally {
          controller.close();
        }
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    },
  );

  return response;
}
