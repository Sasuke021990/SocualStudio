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
  "set_color_grading",
  "create_motion_composition",
  "add_motion_layer",
  "add_motion_text_animator",
  "add_motion_text_shader_animator",
  "insert_motion_into_editor",
  "list_graphic_templates",
  "insert_graphic_template",
  "caption_qc",
  "sync_motion_to_audio",
  "apply_motion_preset_to_beats",
]);
// import_captions is deliberately NOT here: captions are core content (Final
// review #4), not creative polish, so a bad content payload should abort the
// render loudly instead of silently shipping a reel with no captions.
// remove_filler_words/remove_pauses were removed from the pipeline entirely
// (Final review #1) rather than added here — see composer.ts.

export class ReelStepError extends Error {
  readonly stepLabel: string;
  constructor(stepLabel: string, message: string) {
    super(`${stepLabel}: ${message}`);
    this.stepLabel = stepLabel;
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

/**
 * Id lookup for captureAs tokens, broader than actionId(): tries
 * entity-specific field names first (compositionId/layerId/graphicId/
 * templateId), since OpenReel's created-entity field name isn't confirmed
 * for every tool without a live connection (Final review #2) — then falls
 * back to actionId/id, then — for list-shaped results like
 * list_graphic_templates — the first item's id (Final review #5).
 */
function capturedEntityId(text: string): string | null {
  const data = jsonOf(text);
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const direct =
    (obj.compositionId as string | undefined) ??
    (obj.layerId as string | undefined) ??
    (obj.graphicId as string | undefined) ??
    (obj.templateId as string | undefined) ??
    (obj.actionId as string | undefined) ??
    (obj.id as string | undefined);
  if (direct) return direct;

  const list = Array.isArray(data)
    ? (data as unknown[])
    : Array.isArray(obj.templates)
      ? (obj.templates as unknown[])
      : Array.isArray(obj.items)
        ? (obj.items as unknown[])
        : null;
  if (list && list.length > 0 && list[0] && typeof list[0] === "object") {
    const first = list[0] as Record<string, unknown>;
    return (first.id as string | undefined) ?? (first.templateId as string | undefined) ?? null;
  }
  return null;
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
 * Track/clip ids follow OpenReel's addressing convention (`track-<actionId>-0`
 * / `<actionId>-0`); a step with `captureAs` instead stores whatever
 * capturedEntityId() finds (entity-specific field, actionId/id, or a list's
 * first item) under that token, with a warning if nothing matched.
 */
export async function runSteps(conn: McpConnection, steps: ReelToolStep[]): Promise<string> {
  const map = new Map<string, string>();
  const dims = new Map<string, { w: number; h: number }>();
  let exportText = "";

  for (const step of steps) {
    if (step.tool === "noop") continue;

    const args = substitute(step.args, map) as Record<string, unknown>;
    let text: string;
    if (NON_FATAL_TOOLS.has(step.tool)) {
      // A transport-level throw (timeout, JSON-RPC error, connection reset)
      // is just as recoverable for a creative-polish step as an in-band
      // OpenReel error code — neither should abort the whole render
      // (Final review #3).
      try {
        text = await conn.callTool(step.tool, args);
      } catch (err) {
        console.warn(`[reel] non-fatal creative step threw (${step.label}):`, err instanceof Error ? err.message : String(err));
        continue;
      }
    } else {
      try {
        text = await conn.callTool(step.tool, args);
      } catch (err) {
        // A thrown error (e.g. MCP isError:true) for a fatal step used to be
        // impossible — callTool returned the error as text, which the
        // ERROR_CODES check below wrapped in a ReelStepError. Now that the
        // MCP client throws on isError, a fatal step's failure must still
        // come out as a ReelStepError so callers (route.ts) get the step
        // label, not a bare, unlabeled error (review fix).
        const msg = err instanceof Error ? err.message : String(err);
        throw new ReelStepError(step.label, msg);
      }
    }

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

    if (step.captureAs) {
      const captured = capturedEntityId(text);
      if (captured) {
        map.set(step.captureAs, captured);
      } else {
        console.warn(
          `[reel] captureAs "${step.captureAs}" found no id in the result for step "${step.label}" — later steps using this token will send it unresolved`,
        );
      }
    }

    if (id) {
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
            // set_clip_transform is on the non-fatal list, so a failure here —
            // whether returned as error text or thrown (MCP isError) — must
            // never abort the whole render over a cosmetic crop (review fix).
            try {
              const trText = await conn.callTool("set_clip_transform", {
                clipId,
                transform: { fitMode: "cover" },
              });
              if (ERROR_CODES.test(trText)) {
                console.warn(`[reel] cover-fit failed for ${step.clipName}:`, trText.slice(0, 200));
              }
            } catch (err) {
              console.warn(
                `[reel] cover-fit threw for ${step.clipName}:`,
                err instanceof Error ? err.message : String(err),
              );
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
