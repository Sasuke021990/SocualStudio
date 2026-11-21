import { getComfyUIState } from "./store";

/**
 * Best-effort unload of ComfyUI models + free GPU memory before LLM inference.
 * Frees ALL saved connections (not just active) — every instance may hold VRAM.
 * ComfyUI POST /free {"unload_models": true, "free_memory": true}.
 * Never blocks the LLM call.
 */
export async function freeComfyUIModels(): Promise<{ freed: boolean; message: string }> {
  const state = await getComfyUIState();
  if (state.connections.length === 0) {
    return { freed: true, message: "ComfyUI not configured — nothing to free" };
  }

  const results: string[] = [];
  await Promise.allSettled(
    state.connections.map(async (connection) => {
      const baseUrl = connection.baseUrl.replace(/\/+$/, "");
      try {
        const res = await fetch(`${baseUrl}/free`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unload_models: true, free_memory: true }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          results.push(connection.name);
        }
      } catch {
        // best-effort — skip unreachable instance
      }
    }),
  );

  if (results.length > 0) {
    return { freed: true, message: `ComfyUI freed: ${results.join(", ")} — GPU ready for LLM` };
  }
  return { freed: false, message: "ComfyUI free failed on all connections" };
}
