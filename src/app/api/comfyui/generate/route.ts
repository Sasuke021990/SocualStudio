import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveConnection, getComfyUIState } from "@/features/comfyui/store";
import { getProviderConfig } from "@/features/ai-provider/store";
import { unloadLocalModel } from "@/features/ai-provider/unload";

const generateSchema = z.object({
  prompt: z.string().min(1, "Image prompt required"),
  negativePrompt: z.string().optional(),
  width: z.number().min(64).max(2048).default(1024),
  height: z.number().min(64).max(2048).default(1024),
  connectionId: z.string().optional(),
});

/** Inject prompt text into workflow's text-encode nodes */
function injectPrompt(workflow: Record<string, unknown>, prompt: string, negativePrompt?: string): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(workflow)) as Record<string, { inputs?: Record<string, unknown>; class_type?: string }>;
  for (const [, node] of Object.entries(cloned)) {
    if (!node || typeof node !== "object" || !node.inputs) continue;
    const ct = node.class_type ?? "";
    // CLIPTextEncode nodes carry positive/negative prompts
    if (ct === "CLIPTextEncode" || ct === "CLIPTextEncodeSDXL" || ct === "CLIPTextEncodeSDXLRefiner") {
      const current = String(node.inputs.text ?? "");
      const isNegative = /negative/i.test(current) || current === "";
      if (negativePrompt && isNegative && node.inputs.text !== undefined) {
        node.inputs.text = negativePrompt;
      } else if (node.inputs.text !== undefined) {
        node.inputs.text = prompt;
      }
    }

    // Qwen image pipelines: TextEncodeQwenImage21 (encoder) + TextGenerate (prompt-rewriter LLM).
    // The encoder's prompt input may be a node link (e.g. through a switch node that can
    // route an empty string) — replace it with the literal prompt so our text always wins.
    if (ct.startsWith("TextEncodeQwen")) {
      if ("prompt" in node.inputs) {
        node.inputs.prompt = prompt;
      }
      if (negativePrompt && "negative_prompt" in node.inputs) {
        node.inputs.negative_prompt = negativePrompt;
      }
    }
    if (ct === "TextGenerate" && "prompt" in node.inputs) {
      node.inputs.prompt = prompt;
    }
    // EmptyLatentImage for size
    if (ct === "EmptyLatentImage" && node.inputs) {
      // leave width/height as configured in workflow
    }

    // Randomize seeds so each generation produces a different image.
    // Walk inputs recursively — some workflows nest seeds (e.g. sampling_mode.seed).
    if (node.inputs) {
      const randomizeSeeds = (obj: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "number" && /seed/i.test(key)) {
            obj[key] = Math.floor(Math.random() * 2 ** 32);
          } else if (value && typeof value === "object" && !Array.isArray(value)) {
            randomizeSeeds(value as Record<string, unknown>);
          }
        }
      };
      randomizeSeeds(node.inputs);
    }
  }
  return cloned;
}

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

  const baseUrl = connection.baseUrl.replace(/\/+$/, "");
  const { prompt, negativePrompt } = parsed.data;

  // Free VRAM first: unload the locally loaded LLM (LM Studio / Ollama) before
  // handing the GPU to ComfyUI. Best-effort — never blocks image generation.
  const providerConfig = getProviderConfig();
  const unloadResult = await unloadLocalModel(providerConfig);

  try {
    // Inject prompt into workflow
    const workflow = injectPrompt(connection.workflowJson, prompt, negativePrompt);

    // Queue prompt
    const queueRes = await fetch(`${baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(15000),
    });

    if (!queueRes.ok) {
      const errText = await queueRes.text().catch(() => "");
      return NextResponse.json(
        { error: `ComfyUI rejected the workflow: ${queueRes.status} ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const queueData = await queueRes.json() as { prompt_id?: string };
    const promptId = queueData.prompt_id;
    if (!promptId) {
      return NextResponse.json({ error: "ComfyUI did not return a prompt_id" }, { status: 502 });
    }

    // Poll history until done (max 120s)
    const startTime = Date.now();
    while (Date.now() - startTime < 120_000) {
      await new Promise((r) => setTimeout(r, 2000));
      const histRes = await fetch(`${baseUrl}/history/${promptId}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!histRes.ok) continue;
      const hist = await histRes.json() as Record<string, {
        outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
      }>;
      const entry = hist[promptId];
      if (entry?.outputs) {
        // Collect generated image info
        const images: Array<{ filename: string; subfolder: string; type: string; url: string }> = [];
        for (const output of Object.values(entry.outputs)) {
          if (output?.images) {
            for (const img of output.images) {
              images.push({
                ...img,
                url: `${baseUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`,
              });
            }
          }
        }
        if (images.length > 0) {
          // Proxy through our API to avoid browser CORS issues with ComfyUI /view
          const proxied = images.map((img) => ({
            ...img,
            url: `/api/comfyui/image?url=${encodeURIComponent(img.url)}`,
          }));
          return NextResponse.json({ images: proxied, promptId, unload: unloadResult });
        }
      }
    }

    return NextResponse.json(
      { error: "Image generation timed out after 120 seconds" },
      { status: 504 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
