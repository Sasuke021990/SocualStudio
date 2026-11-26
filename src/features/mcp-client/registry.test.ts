import { test } from "node:test";
import assert from "node:assert/strict";
import { toolParameters } from "./registry";

test("toolParameters passes a real object inputSchema through unchanged", () => {
  const schema = { type: "object", properties: { clip: { type: "object" } }, required: ["clip"] };
  assert.deepEqual(toolParameters(schema), schema);
});

test("toolParameters falls back to an empty object schema when inputSchema is missing", () => {
  assert.deepEqual(toolParameters(undefined), { type: "object", properties: {} });
});

test("toolParameters falls back to an empty object schema when inputSchema is not an object", () => {
  assert.deepEqual(toolParameters(null), { type: "object", properties: {} });
  assert.deepEqual(toolParameters("not a schema" as unknown as Record<string, unknown>), { type: "object", properties: {} });
});
