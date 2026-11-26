import type { McpServerConfig } from "@/features/mcp-client/types";
import { withMcpConnection, type McpConnection } from "@/features/mcp-client/client";
import type { ReelToolStep } from "./composer";

const ERROR_CODES = /\((INVALID_PARAMS|TOOL_ERROR|OUTSIDE_ALLOWED_ROOTS|NOT_FOUND|UNSUPPORTED)\b/;

/**
 * Tools whose failure is creative polish, not a broken render: log and move
 * on instead of aborting the whole plan. Each new composition/graphic/audio
 * step added for the "attractive reel" pipeline belongs here too — see
 * docs/superpowers/plans/2026-11-26-openreel-pipeline-improvements.md.
 */
const NON_FATAL_TOOLS = new Set<string>([
  "add_transition",
  "add_video_effect",
  "set_clip_transform",
  "set_clip_keyframes",
]);

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
 * Run a composed plan's steps against an already-connected OpenReel server.
 * Exported (separately from `executeReelPlan`) so it's testable with a fake
 * `McpConnection`, without going through the real `withMcpConnection` pool.
 * Ids are resolved from step results (OpenReel returns `{actionId}`; created
 * tracks/clips are addressed as `track-<actionId>-0` / `<actionId>-0`; any
 * step with `captureAs` stores its returned id under that token instead).
 */
export async function runSteps(conn: McpConnection, steps: ReelToolStep[]): Promise<string> {
  const map = new Map<string, string>();
  const dims = new Map<string, { w: number; h: number }>();
  let exportText = "";

  for (const step of steps) {
    if (step.tool === "noop") continue;

    const args = substitute(step.args, map) as Record<string, unknown>;
    const text = await conn.callTool(step.tool, args);

    if (ERROR_CODES.test(text)) {
      // Creative polish steps (transitions / VFX / motion graphics / etc.)
      // should never abort the whole render if parameters miss.
      if (NON_FATAL_TOOLS.has(step.tool)) {
        console.warn(`[reel] non-fatal creative step warning (${step.label}):`, text.slice(0, 300));
        continue;
      }
      throw new ReelStepError(step.label, text.slice(0, 400));
    }

    const parsed = jsonOf(text) as { imported?: Array<{ mediaId: string; width?: number; height?: number }> } | null;
    if (step.resolve?.includes("media") && parsed?.imported && step.mediaNames) {
      // Order matches the import `paths`
      parsed.imported.forEach((m, i) => {
        const name = step.mediaNames![i];
        if (!name) return;
        map.set(`__media:${name}__`, m.mediaId);
        if (m.width && m.height) dims.set(name, { w: m.width, h: m.height });
      });
    }

    const id = actionId(text);
    if (id) {
      if (step.captureAs) map.set(step.captureAs, id);
      if (step.tool === "add_track") {
        if (!map.has("__videoTrack__")) map.set("__videoTrack__", `track-${id}-0`);
        else if (!map.has("__audioTrack1__")) map.set("__audioTrack1__", `track-${id}-0`);
        else map.set("__audioTrack2__", `track-${id}-0`);
      }
      if (step.tool === "add_clip" && step.clipName) {
        const clipId = `${id}-0`;
        map.set(`__clip:${step.clipName}__`, clipId);
        // Cover-scale off-aspect media (e.g. a reused 1:1 image) so it fills
        // the 9:16 frame instead of floating in black bars.
        const d = dims.get(step.clipName);
        if (step.clipName.startsWith("img") && d) {
          const mediaAspect = d.w / d.h;
          const frameAspect = 9 / 16;
          const ratio = Math.max(mediaAspect, frameAspect) / Math.min(mediaAspect, frameAspect);
          if (ratio > 1.02) {
            // fitMode cover: fill the 9:16 frame, crop the overflow (no scale math).
            const trText = await conn.callTool("set_clip_transform", {
              clipId,
              transform: { fitMode: "cover" },
            });
            if (ERROR_CODES.test(trText)) {
              console.warn(`[reel] cover-fit failed for ${step.clipName}:`, trText.slice(0, 200));
            }
          }
        }
      }
    }

    if (step.tool === "export_video") exportText = text;
  }

  return exportText;
}

/** Execute a composed plan against the OpenReel server (borrows a pooled connection). */
export async function executeReelPlan(server: McpServerConfig, steps: ReelToolStep[]): Promise<string> {
  return withMcpConnection(server, (conn) => runSteps(conn, steps));
}
