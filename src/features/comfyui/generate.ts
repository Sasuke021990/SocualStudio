// NOTE: typed loosely against the ComfyUI connection shape from features/comfyui/store.
export interface ComfyConnectionLike {
  baseUrl: string;
  workflowJson: Record<string, unknown> | null;
}

export interface ComfyImageResult {
  filename: string;
  subfolder: string;
  type: string;
  /** Raw ComfyUI /view URL (callers proxy or download it). */
  viewUrl: string;
}

/** Inject prompt text into workflow's text-encode nodes and randomize seeds. */
export function injectPrompt(
  workflow: Record<string, unknown>,
  prompt: string,
  negativePrompt?: string,
): Record<string, unknown> {
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

    // Randomize seeds so each generation produces a different image.
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

/**
 * Run one image generation on a ComfyUI connection and wait for the result.
 * Does NOT touch VRAM management — callers decide unload/free policy.
 */
export async function generateComfyImages(
  connection: ComfyConnectionLike,
  prompt: string,
  negativePrompt?: string,
): Promise<ComfyImageResult[]> {
  if (!connection.workflowJson) {
    throw new Error("No ComfyUI connection with workflow. Add one in Settings and set it active.");
  }
  const baseUrl = connection.baseUrl.replace(/\/+$/, "");
  const workflow = injectPrompt(connection.workflowJson, prompt, negativePrompt);

  const queueRes = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(15000),
  });
  if (!queueRes.ok) {
    const errText = await queueRes.text().catch(() => "");
    throw new Error(`ComfyUI rejected the workflow: ${queueRes.status} ${errText.slice(0, 200)}`);
  }
  const queueData = (await queueRes.json()) as { prompt_id?: string };
  const promptId = queueData.prompt_id;
  if (!promptId) throw new Error("ComfyUI did not return a prompt_id");

  // Poll history until done (max 120s)
  const startTime = Date.now();
  while (Date.now() - startTime < 120_000) {
    await new Promise((r) => setTimeout(r, 2000));
    const histRes = await fetch(`${baseUrl}/history/${promptId}`, { signal: AbortSignal.timeout(10000) });
    if (!histRes.ok) continue;
    const hist = (await histRes.json()) as Record<
      string,
      { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }
    >;
    const entry = hist[promptId];
    if (entry?.outputs) {
      const images: ComfyImageResult[] = [];
      for (const output of Object.values(entry.outputs)) {
        if (output?.images) {
          for (const img of output.images) {
            images.push({
              ...img,
              viewUrl: `${baseUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`,
            });
          }
        }
      }
      if (images.length > 0) return images;
    }
  }
  throw new Error("Image generation timed out after 120 seconds");
}
