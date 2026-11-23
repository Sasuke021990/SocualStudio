import { freeComfyUIModels } from "@/features/comfyui/free";

/**
 * VRAM policy: free GPU memory before ANY generation work.
 * LLM calls get the GPU by releasing ComfyUI model instances first.
 * (Image generation does the reverse via unloadLocalModel — see its route.)
 * Best-effort: never blocks content generation.
 */
export async function prepareForLlm(): Promise<void> {
  try {
    await freeComfyUIModels();
  } catch {
    // best-effort
  }
}
