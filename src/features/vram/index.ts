import { freeComfyUIModels } from "@/features/comfyui/free";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { getProviderConfig } from "@/features/ai-provider/store";

export type VramTarget = "comfyui" | "llm" | "all";

export interface FreeVramOptions {
  target?: VramTarget;
}

export interface FreeVramResult {
  comfyui?: { freed: boolean; message: string };
  llm?: { unloaded: boolean; message: string };
}

/**
 * Automatically unload models and free GPU memory across generation engines.
 * Safe to invoke in finally blocks — errors are isolated and logged.
 */
export async function autoFreeVram(options?: FreeVramOptions): Promise<FreeVramResult> {
  const target = options?.target ?? "all";
  const result: FreeVramResult = {};

  if (target === "comfyui" || target === "all") {
    try {
      result.comfyui = await freeComfyUIModels();
    } catch (err) {
      result.comfyui = {
        freed: false,
        message: err instanceof Error ? err.message : "ComfyUI unload failed",
      };
    }
  }

  if (target === "llm" || target === "all") {
    try {
      const config = getProviderConfig();
      result.llm = await unloadLocalModel(config);
    } catch (err) {
      result.llm = {
        unloaded: false,
        message: err instanceof Error ? err.message : "LLM unload failed",
      };
    }
  }

  return result;
}

