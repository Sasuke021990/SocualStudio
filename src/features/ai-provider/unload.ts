import type { ProviderConfig } from "./types";

/**
 * Best-effort unload of the locally loaded LLM to free VRAM before ComfyUI generation.
 * Supports LM Studio and Ollama. Cloud providers (OpenAI, custom remote) are skipped.
 */
export async function unloadLocalModel(config: ProviderConfig): Promise<{ unloaded: boolean; message: string }> {
  const base = config.baseUrl.replace(/\/+$/, "");

  // Strip /v1 suffix to get server root
  const root = base.replace(/\/v1$/, "");

  if (config.providerId === "ollama") {
    // Ollama: send keep_alive: 0 to unload the model from memory
    try {
      const res = await fetch(`${root}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, keep_alive: 0 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        return { unloaded: true, message: `Ollama model "${config.model}" unloaded from VRAM` };
      }
      return { unloaded: false, message: `Ollama unload returned ${res.status}` };
    } catch (err) {
      return { unloaded: false, message: `Ollama unload failed: ${err instanceof Error ? err.message : "unknown"}` };
    }
  }

  if (config.providerId === "lm-studio") {
    // LM Studio: GET /api/v1/models -> collect loaded_instances[].id -> POST /api/v1/models/unload {instance_id}
    try {
      const listRes = await fetch(`${root}/api/v1/models`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!listRes.ok) {
        return { unloaded: false, message: `LM Studio models list returned ${listRes.status}` };
      }
      const data = await listRes.json() as {
        models?: Array<{ loaded_instances?: Array<{ id?: string }> }>;
      };
      const instanceIds: string[] = [];
      for (const model of data.models ?? []) {
        for (const inst of model.loaded_instances ?? []) {
          if (inst.id) instanceIds.push(inst.id);
        }
      }
      if (instanceIds.length === 0) {
        return { unloaded: true, message: "LM Studio: no models loaded, nothing to unload" };
      }
      const results: string[] = [];
      for (const instanceId of instanceIds) {
        const res = await fetch(`${root}/api/v1/models/unload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instance_id: instanceId }),
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) {
          results.push(instanceId);
        }
      }
      if (results.length > 0) {
        return { unloaded: true, message: `LM Studio unloaded: ${results.join(", ")} — VRAM freed` };
      }
      return { unloaded: false, message: "LM Studio unload requests failed (model may stay loaded)" };
    } catch (err) {
      return { unloaded: false, message: `LM Studio unload failed: ${err instanceof Error ? err.message : "unknown"}` };
    }
  }

  // OpenAI / custom remote: nothing to unload
  return { unloaded: true, message: "Remote provider — no local VRAM to free" };
}
