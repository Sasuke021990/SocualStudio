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

test("captureAs prefers an entity-specific id field (compositionId) over the generic actionId (Final review #2)", async () => {
  const { conn, calls } = fakeConn({
    create_motion_composition: '{"actionId": "a-1", "compositionId": "comp-real-id"}',
  });
  const steps: ReelToolStep[] = [
    { label: "create", tool: "create_motion_composition", args: {}, captureAs: "__composition:popup0__" },
    { label: "layer", tool: "add_motion_layer", args: { compositionId: "__composition:popup0__" } },
  ];
  await runSteps(conn, steps);
  const layerCall = calls.find((c) => c.name === "add_motion_layer")!;
  assert.equal((layerCall.args as { compositionId: string }).compositionId, "comp-real-id");
});

test("captureAs falls back to the first item's id for a list-shaped result, e.g. list_graphic_templates (Final review #5)", async () => {
  const { conn, calls } = fakeConn({
    list_graphic_templates: '{"templates": [{"id": "tmpl-7", "label": "Classic End Card"}, {"id": "tmpl-8"}]}',
  });
  const steps: ReelToolStep[] = [
    { label: "lookup", tool: "list_graphic_templates", args: { category: "end-card" }, captureAs: "__template:end-card__" },
    { label: "insert", tool: "insert_graphic_template", args: { templateId: "__template:end-card__" } },
  ];
  await runSteps(conn, steps);
  const insertCall = calls.find((c) => c.name === "insert_graphic_template")!;
  assert.equal((insertCall.args as { templateId: string }).templateId, "tmpl-7");
});

test("captureAs warns (but doesn't throw) when no id-like field is found in the result (Final review #2)", async (t) => {
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(String(args[0]));
  });
  const { conn } = fakeConn({
    create_motion_composition: '{"status": "ok"}',
  });
  const steps: ReelToolStep[] = [{ label: "create", tool: "create_motion_composition", args: {}, captureAs: "__composition:popup0__" }];
  await runSteps(conn, steps);
  assert.ok(warnings.some((w) => w.includes("__composition:popup0__")));
});

test("a thrown error from a non-fatal tool call is caught and logged, not propagated (Final review #3)", async (t) => {
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(String(args[0]));
  });
  const conn = {
    async callTool(name: string) {
      if (name === "add_transition") throw new Error("transport reset");
      return '{"path": "/out.mp4"}';
    },
    async listTools() {
      return [];
    },
    async close() {},
  };
  const steps: ReelToolStep[] = [
    { label: "transition step", tool: "add_transition", args: {} },
    { label: "e", tool: "export_video", args: {} },
  ];
  const result = await runSteps(conn, steps);
  assert.ok(warnings.some((w) => w.includes("transition step") || w.includes("transport reset")));
  assert.equal(result, '{"path": "/out.mp4"}');
});

test("a thrown error from a FATAL (non-whitelisted) tool call still propagates (Final review #3)", async () => {
  const conn = {
    async callTool(name: string) {
      if (name === "create_text_clip") throw new Error("transport reset");
      return "{}";
    },
    async listTools() {
      return [];
    },
    async close() {},
  };
  const steps: ReelToolStep[] = [{ label: "x", tool: "create_text_clip", args: {} }];
  await assert.rejects(() => runSteps(conn, steps));
});

test("import_captions is fatal, not non-fatal: captions are core content, not creative polish (Final review #4)", async () => {
  const { conn } = fakeConn({
    import_captions: "(TOOL_ERROR) bad content",
  });
  const steps: ReelToolStep[] = [{ label: "caps", tool: "import_captions", args: {} }];
  await assert.rejects(() => runSteps(conn, steps));
});
