# Design — MCP Client: External Server Connections

**Status:** Approved (design only — not yet implemented)
**Date:** 2026-11-22
**Scope:** Settings → MCP tab; Social Studio acts as an **MCP client** to external servers.

---

## 1. Understanding Summary

- **What:** New Settings tab **MCP** to add/edit/test/remove outbound MCP server connections (stdio + Streamable HTTP). Connected servers' tools are injected into the AI pipeline.
- **Why:** extend local generation with external MCP capabilities (search, data, custom tools) without leaving the local-first model.
- **Who:** power users already running MCP servers (Claude Desktop / Cursor ecosystem).
- **Behavior:** per-stage user toggles decide where MCP tools are callable: **Brand Extraction · Research & Beats · Content Generation**.
- **Constraints:** Next.js Node server (stdio child processes server-side), LM Studio/Ollama/OpenAI tool calling via `OpenAICompatibleProvider`, config persisted in the existing per-feature `store.ts` → `DATA_DIR` JSON pattern.
- **Non-goals (v1):** configuring the app's own `/mcp` server, manual tool playground, multi-user/remote auth, tool-result caching, SSE transport.

## 2. Assumptions

1. Persistence = `DATA_DIR/mcp.json` via a feature store, mirroring `workspace-config/store.ts`.
2. HTTP transport = Streamable HTTP with optional custom headers; legacy SSE → clear test error.
3. stdio servers = user-configured `command + args + env`, spawned by the Node server.
4. **Security:** stdio = arbitrary code execution; single-user local app, trusted config, UI warning; no sandboxing in v1.
5. Scale: handful of servers / tens of tools; tool budget per request capped (D6) instead of rate limiting.
6. Stage toggles cover the three LLM stages that exist today.
7. Tool names namespaced `servername__toolname`; providers without tool support run toolless.

## 3. Decision Log

| # | Decision | Alternatives | Why |
|---|----------|--------------|-----|
| D1 | Outbound MCP **client** (connect to external servers) | expose own `/mcp`; both | user direction |
| D2 | Tools feed AI pipeline with **per-stage toggles** | all stages fixed; research-only | user choice — configurable |
| D3 | **stdio + Streamable HTTP** transports | HTTP only; stdio only | user choice — covers real-world servers |
| D4 | **Approach A**: thin `features/mcp-client/` (store/client/registry) + tool-loop in provider | monolith module; agent framework | separation, testability, YAGNI |
| D5 | **Lazy** per-generation connections (open → use → close) | resident daemons | stateless app, no lifecycle management |
| D6 | Tool budget: **5 tool-call rounds / 8 tool executions** per request, 30 s call timeout | unlimited | latency + cost guard |
| D7 | Tool failures return `"[tool error] …"` strings; never throw into generation | hard-fail generation | resilience |
| D8 | Tool results **folded into the final prompt** (`[Tool results]` block) instead of `role:"tool"` message round-trips | full multi-turn tool message history | keeps `response_format` + streaming paths untouched; local-provider compatibility |

## 4. Final Design

### 4.1 Architecture

```
src/features/mcp-client/
  types.ts     McpServerConfig, McpToolInfo, stage toggles
  schemas.ts   zod validation (pattern: ai-provider/schemas.ts)
  store.ts     DATA_DIR/mcp.json read/write (pattern: workspace-config/store.ts)
  client.ts    connect(server) → { listTools(), callTool(), close() }
                 stdio → StdioClientTransport({ command, args, env })
                 http  → StreamableHTTPClientTransport({ url, headers })
  registry.ts  toolsForStage(stage) → OpenAI-format tool schemas
src/app/api/mcp/route.ts          GET list / POST create / PATCH update / DELETE
src/app/api/mcp/test/route.ts     POST { id } → connect, list tools, close → health report
src/features/mcp/components/McpSetup.tsx   Settings tab UI (5th tab)
```

### 4.2 Config (`DATA_DIR/mcp.json`)

```json
{
  "servers": [{
    "id": "uuid", "name": "filesystem",
    "transport": "stdio" | "http",
    "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/data"],
    "env": { "KEY": "val" },
    "url": "http://localhost:8931/mcp",
    "headers": { "Authorization": "Bearer …" },
    "enabled": true
  }],
  "stages": { "brandExtraction": false, "research": true, "contentGeneration": true }
}
```

### 4.3 UI (Settings → MCP tab)

Mirrors `ComfyUISetup` conventions (SVG icons via `icons.tsx`, `role="status"` saves, `role="alert"` errors, no emoji):

- Header: `IconPlug` + "MCP Servers" + **+ Add Server**.
- Stage toggles card: 3 switches with descriptions, instant save + announced status; hint when all off.
- Server rows: name + transport summary, status chip (`Connected · N tools` / `Error: …` / `Not tested`), **Test**, enable toggle, **Edit**, **Delete** (type-to-confirm dialog, `aria-label={"Delete " + name}`), expandable tool list.
- Add/Edit form: transport radio; stdio fields (`command`, `args` chip-list, `env` rows) or http fields (`url`, `headers` rows); **Test connection**; stdio trust warning.
- Empty state: plug SVG + "No MCP servers yet".

### 4.4 Pipeline integration

- `OpenAICompatibleProvider` gains optional `tools` + `executeTool(name, args)`; both `stream()` and `complete()` run the bounded tool loop (D6).
- Each generation route asks `registry.toolsForStage(stage)`; empty registry ⇒ current behavior (no `tools` param).
- Tool results JSON-stringified and truncated to ~4 KB; connect failures omit tools; `callTool` failures produce `[tool error]` outputs (D7).
- Shared MCP client per server with promise-deduped connects; `generation-lock.ts` already serializes heavy work.
- Model without tool support ⇒ toolless generation; UI shows "MCP tools unavailable for this model" via `supported` flag from `/api/mcp/test`.

### 4.5 Errors & edge cases

- Connect fail → `Error: <reason>` chip; tools omitted. Mid-call stdio exit → reconnect next generation. Invalid config → 400 + field errors, store never persists invalid shapes.
- Delete server during in-flight generation → client refcount keeps it alive until call ends.
- Hallucinated tool name → `[tool error] unknown tool`, loop self-corrects.

### 4.6 Testing

- Unit: registry (namespacing/stage filter/schema mapping), store round-trip + zod, loop caps (mock provider).
- Integration: `/api/mcp*` CRUD + test against an in-memory fixture MCP server.
- Manual: real `server-filesystem` (stdio) + one HTTP server end-to-end in Content Generation.
- Regression: zero-server generation byte-identical to current behavior.
