import type { McpServerConfig } from "@/features/mcp-client/types";
import { withMcpConnection } from "@/features/mcp-client/client";
import type { ReelToolStep } from "./composer";

const ERROR_CODES = /\((INVALID_PARAMS|TOOL_ERROR|OUTSIDE_ALLOWED_ROOTS|NOT_FOUND|UNSUPPORTED)\b/;

export class ReelStepError extends Error {
  constructor(readonly stepLabel: string, message: string) {
    super(`${stepLabel}: ${message}`);
    this.name = "ReelStepError";
  }
}

function jsonOf(text: string): unknown {
  const a = text.indexOf("[");
  const o = text.indexOf("{");
  const i = a >= 0 && (o < 0 || a < o) ? a : o;
  try {
    return JSON.parse(text.slice(i));
  } catch {
    return null;
  }
}

function actionId(text: string): string | null {
  const data = jsonOf(text) as { actionId?: string; id?: string } | null;
  return data?.actionId ?? data?.id ?? null;
}

/** Deep-substitute `${token}` style placeholders in step arguments. */
function substitute(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === "string") {
    return map.has(value) ? map.get(value) : value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, map));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = substitute(v, map);
    return out;
  }
  return value;
}

/**
 * Execute a composed plan against the OpenReel server.
 * Ids are resolved from step results (OpenReel returns `{actionId}`; created
 * tracks/clips are addressed as `track-<actionId>-0` / `<actionId>-0`).
 */
export async function executeReelPlan(server: McpServerConfig, steps: ReelToolStep[]): Promise<string> {
  return withMcpConnection(server, async (conn) => {
    const map = new Map<string, string>();
    let exportText = "";

    for (const step of steps) {
      if (step.tool === "noop") continue;

      const args = substitute(step.args, map) as Record<string, unknown>;
      const text = await conn.callTool(step.tool, args);

      if (ERROR_CODES.test(text)) {
        throw new ReelStepError(step.label, text.slice(0, 400));
      }

      const imported = (jsonOf(text) as { imported?: Array<{ mediaId: string }> } | null)?.imported;
      if (step.resolve?.includes("media") && imported && step.mediaNames) {
        // Order matches the import `paths`
        imported.forEach((m, i) => {
          const name = step.mediaNames![i];
          if (name) map.set(`__media:${name}__`, m.mediaId);
        });
      }

      const id = actionId(text);
      if (id) {
        if (step.tool === "add_track") {
          if (!map.has("__videoTrack__")) map.set("__videoTrack__", `track-${id}-0`);
          else if (!map.has("__audioTrack1__")) map.set("__audioTrack1__", `track-${id}-0`);
          else map.set("__audioTrack2__", `track-${id}-0`);
        }
        if (step.tool === "add_clip" && step.clipName) {
          map.set(`__clip:${step.clipName}__`, `${id}-0`);
        }
      }

      if (step.tool === "export_video") exportText = text;
    }

    return exportText;
  });
}
