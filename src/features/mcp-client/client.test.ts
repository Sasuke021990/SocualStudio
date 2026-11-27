import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCallToolResult } from "./client";

test("returns joined text content when isError is absent", () => {
  const result = parseCallToolResult({ content: [{ type: "text", text: "ok" }] });
  assert.equal(result, "ok");
});

test("throws using the content text when isError is true", () => {
  assert.throws(
    () => parseCallToolResult({ content: [{ type: "text", text: "needs confirmation" }], isError: true }),
    /needs confirmation/,
  );
});

test("throws with a fallback message when isError is true and content is empty", () => {
  assert.throws(() => parseCallToolResult({ isError: true }), /isError/);
});
