import { test } from "node:test";
import assert from "node:assert/strict";
import { runSteps } from "./executor";
import type { ReelToolStep } from "./composer";

function fakeConn(responses: Record<string, string | string[]>) {
  const calls: Array<{ name: string; args: unknown }> = [];
  const cursor = new Map<string, number>();
  return {
    calls,
    conn: {
      async callTool(name: string, args: unknown) {
        calls.push({ name, args });
        const r = responses[name];
        if (Array.isArray(r)) {
          const i = cursor.get(name) ?? 0;
          cursor.set(name, i + 1);
          return r[Math.min(i, r.length - 1)];
        }
        return r ?? "{}";
      },
      async listTools() {
        return [];
      },
      async close() {},
    },
  };
}

test("a step in the non-fatal set logs a warning and continues instead of throwing", async (t) => {
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(String(args[0]));
  });
  const { conn } = fakeConn({
    add_transition: "(INVALID_PARAMS) bad clip id",
    export_video: '{"path": "/out.mp4"}',
  });
  const steps: ReelToolStep[] = [
    { label: "t", tool: "add_transition", args: {} },
    { label: "e", tool: "export_video", args: {} },
  ];
  const result = await runSteps(conn, steps);
  assert.equal(warnings.length, 1);
  assert.equal(result, '{"path": "/out.mp4"}');
});

test("a step NOT in the non-fatal set throws on an OpenReel error code", async () => {
  const { conn } = fakeConn({
    create_text_clip: "(TOOL_ERROR) nope",
  });
  const steps: ReelToolStep[] = [{ label: "x", tool: "create_text_clip", args: {} }];
  await assert.rejects(() => runSteps(conn, steps));
});

test("captureAs stores a step's returned id in the token map for later substitution", async () => {
  const { conn, calls } = fakeConn({
    create_motion_composition: '{"actionId": "comp-123"}',
    add_motion_layer: '{"id": "ok"}',
  });
  const steps: ReelToolStep[] = [
    { label: "create", tool: "create_motion_composition", args: {}, captureAs: "__composition:popup0__" },
    { label: "layer", tool: "add_motion_layer", args: { compositionId: "__composition:popup0__" } },
  ];
  await runSteps(conn, steps);
  const layerCall = calls.find((c) => c.name === "add_motion_layer")!;
  assert.equal((layerCall.args as { compositionId: string }).compositionId, "comp-123");
});
