"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DeleteBrandDialog } from "@/components/DeleteBrandDialog";
import { IconPlug, IconServer, IconX } from "@/components/icons";
import type { McpConfig, McpServerConfig, McpStage, McpTransport } from "@/features/mcp-client/types";

interface KvRow { key: string; value: string }

interface FormState {
  id?: string;
  name: string;
  transport: McpTransport;
  command: string;
  args: string[];
  env: KvRow[];
  url: string;
  headers: KvRow[];
}

interface TestReport {
  ok: boolean;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
  error?: string;
}

const STAGE_LABELS: Array<{ key: McpStage; title: string; text: string }> = [
  { key: "brandExtraction", title: "Brand Extraction", text: "Allow MCP tools while AI builds brand profiles." },
  { key: "research", title: "Research & Beats", text: "Allow MCP tools during research and beat planning." },
  { key: "contentGeneration", title: "Content Generation", text: "Allow MCP tools while writing captions and scripts." },
];

function emptyForm(): FormState {
  return { name: "", transport: "stdio", command: "", args: [], env: [], url: "", headers: [] };
}

function toForm(server: McpServerConfig): FormState {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    command: server.command ?? "",
    args: server.args ?? [],
    env: Object.entries(server.env ?? {}).map(([key, value]) => ({ key, value })),
    url: server.url ?? "",
    headers: Object.entries(server.headers ?? {}).map(([key, value]) => ({ key, value })),
  };
}

function rowsToRecord(rows: KvRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.key.trim()) out[r.key.trim()] = r.value;
  return out;
}

export function McpSetup() {
  const [config, setConfig] = useState<McpConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, TestReport>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [argDraft, setArgDraft] = useState("");
  const argInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp", { cache: "no-store" });
      const data = (await res.json()) as McpConfig;
      setConfig(data);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };

  const toggleStage = async (key: McpStage, value: boolean) => {
    if (!config) return;
    const stages = { ...config.stages, [key]: value };
    setConfig({ ...config, stages });
    const res = await fetch("/api/mcp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages }),
    });
    if (!res.ok) {
      setError("Could not save stage settings.");
      load();
    } else {
      flash("Settings saved.");
    }
  };

  const toggleEnabled = async (server: McpServerConfig) => {
    const res = await fetch("/api/mcp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: server.id, enabled: !server.enabled }),
    });
    if (res.ok) flash(server.enabled ? "Server disabled." : "Server enabled.");
    load();
  };

  const committedArgs = () => [...form!.args, ...(argDraft.trim() ? [argDraft.trim()] : [])];

  const saveServer = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        transport: form.transport,
        command: form.transport === "stdio" ? form.command : undefined,
        args: form.transport === "stdio" ? committedArgs() : undefined,
        env: form.transport === "stdio" ? rowsToRecord(form.env) : undefined,
        url: form.transport === "http" ? form.url : undefined,
        headers: form.transport === "http" ? rowsToRecord(form.headers) : undefined,
      };
      const res = await fetch("/api/mcp", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setForm(null);
      flash("Server saved.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (payload: { id?: string; server?: Record<string, unknown> }, key: string) => {
    setTesting(key);
    setError(null);
    try {
      const res = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const report = (await res.json()) as TestReport & { error?: string };
      if (!res.ok) throw new Error(report.error ?? "Test failed");
      setReports((prev) => ({ ...prev, [key]: report }));
    } catch (err) {
      setReports((prev) => ({
        ...prev,
        [key]: { ok: false, toolCount: 0, tools: [], error: err instanceof Error ? err.message : "Test failed" },
      }));
    } finally {
      setTesting(null);
    }
  };

  const deleteServer = (id: string) => async () => {
    const res = await fetch("/api/mcp", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Delete failed");
    setReports((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    load();
  };

  const addArg = () => {
    if (!form) return;
    const value = argDraft.trim();
    if (!value) return;
    setForm({ ...form, args: [...form.args, value] });
    setArgDraft("");
    argInputRef.current?.focus();
  };

  const allStagesOff = config ? Object.values(config.stages).every((v) => !v) : false;

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
          <IconPlug size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">MCP Servers</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect external MCP servers — their tools become available to your AI pipeline.
          </p>
        </div>
        <button type="button" className="btn-primary ml-auto !py-2 !px-4 !text-sm" onClick={() => { setForm(emptyForm()); setError(null); }}>
          + Add Server
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{status}</p>

      {/* Stage toggles */}
      <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Where MCP tools are used</h3>
        <div className="mt-3 space-y-3">
          {STAGE_LABELS.map((stage) => {
            const on = config?.stages[stage.key] ?? false;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`MCP tools for ${stage.title}`}
                  onClick={() => toggleStage(stage.key, !on)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{stage.title}</div>
                  <div className="text-xs text-zinc-500">{stage.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        {allStagesOff && (
          <p className="mt-3 text-xs text-zinc-500">MCP tools are disabled everywhere — connected servers will not be used.</p>
        )}
      </div>

      {/* Server list */}
      <div className="mt-4 space-y-3">
        {(config?.servers ?? []).length === 0 && !form ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 py-10 text-center dark:border-zinc-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 dark:from-indigo-950 dark:to-violet-950 dark:text-indigo-300">
              <IconPlug size={24} />
            </div>
            <p className="text-sm text-zinc-500">No MCP servers yet. Add one to extend your AI pipeline with external tools.</p>
            <button type="button" className="btn-primary !py-2 !px-4 !text-sm" onClick={() => setForm(emptyForm())}>
              Add First Server
            </button>
          </div>
        ) : (
          (config?.servers ?? []).map((server) => {
            const report = reports[server.id];
            return (
              <div
                key={server.id}
                className={`rounded-xl border-2 p-4 transition ${
                  server.enabled
                    ? "border-zinc-200 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60"
                    : "border-zinc-200 bg-zinc-50/60 opacity-70 dark:border-zinc-800 dark:bg-zinc-900/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                    <IconServer size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{server.name}</div>
                    <div className="truncate font-mono text-xs text-zinc-500">
                      {server.transport === "stdio"
                        ? `stdio · ${server.command ?? ""} ${(server.args ?? []).join(" ")}`.trim()
                        : `http · ${server.url ?? ""}`}
                    </div>
                  </div>
                  {report ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        report.ok
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {report.ok ? `Connected · ${report.toolCount} tools` : `Error: ${report.error ?? "connection failed"}`}
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                      Not tested
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={server.enabled}
                    aria-label={`Enable ${server.name}`}
                    onClick={() => toggleEnabled(server)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${server.enabled ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${server.enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-xs text-zinc-500">{server.enabled ? "Enabled" : "Disabled"}</span>
                  <button
                    type="button"
                    className="btn-ghost ml-auto !py-1 !px-2.5 !text-xs"
                    disabled={testing === server.id}
                    onClick={() => runTest({ id: server.id }, server.id)}
                  >
                    {testing === server.id ? "Testing..." : "Test"}
                  </button>
                  {report && report.ok && (
                    <button
                      type="button"
                      className="btn-ghost !py-1 !px-2.5 !text-xs"
                      onClick={() => setExpanded(expanded === server.id ? null : server.id)}
                      aria-expanded={expanded === server.id}
                    >
                      {expanded === server.id ? "Hide tools" : `Show tools (${report.toolCount})`}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost !py-1 !px-2.5 !text-xs"
                    onClick={() => { setForm(toForm(server)); setError(null); }}
                  >
                    Edit
                  </button>
                  <DeleteBrandDialog
                    brandName={server.name}
                    triggerLabel="Delete"
                    triggerClassName="cursor-pointer text-xs text-red-600 transition-colors duration-200 hover:underline dark:text-red-400"
                    confirmLabel="Delete Server"
                    description={`This removes the "${server.name}" MCP connection. Nothing else is affected.`}
                    onConfirm={deleteServer(server.id)}
                  />
                </div>

                {expanded === server.id && report?.ok && (
                  <ul className="mt-3 space-y-1.5 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/60">
                    {report.tools.map((tool) => (
                      <li key={tool.name} className="text-xs">
                        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{tool.name}</span>
                        {tool.description && <span className="ml-2 text-zinc-500">{tool.description}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / edit form */}
      {form && (
        <div className="mt-4 rounded-xl border-2 border-indigo-300 p-4 dark:border-indigo-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{form.id ? "Edit Server" : "Add Server"}</h3>

          <div className="mt-3 flex gap-2" role="group" aria-label="Transport">
            {(["stdio", "http"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={form.transport === t}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  form.transport === t
                    ? "bg-indigo-500 text-white"
                    : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                }`}
                onClick={() => setForm({ ...form, transport: t })}
              >
                {t === "stdio" ? "Local process (stdio)" : "HTTP URL"}
              </button>
            ))}
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Server name
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. filesystem"
            />
          </label>

          {form.transport === "stdio" ? (
            <>
              <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Command
                <input
                  className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  placeholder="npx"
                />
              </label>
              <div className="mt-3 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Arguments
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                  {form.args.map((arg, i) => (
                    <span key={`${arg}-${i}`} className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {arg}
                      <button
                        type="button"
                        className="opacity-60 hover:opacity-100"
                        onClick={() => setForm({ ...form, args: form.args.filter((_, j) => j !== i) })}
                        aria-label={`Remove ${arg}`}
                      >
                        <IconX size={12} aria-hidden />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={argInputRef}
                    className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
                    value={argDraft}
                    onChange={(e) => setArgDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addArg();
                      }
                    }}
                    placeholder="Type an argument, press Enter"
                  />
                </div>
              </div>
              <KvEditor
                label="Environment variables"
                rows={form.env}
                onChange={(env) => setForm({ ...form, env })}
                keyPlaceholder="KEY"
                valuePlaceholder="value"
              />
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                stdio servers run as local processes on this machine — only add servers you trust.
              </p>
            </>
          ) : (
            <>
              <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Server URL
                <input
                  className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="http://localhost:8931/mcp"
                />
              </label>
              <KvEditor
                label="Custom headers"
                rows={form.headers}
                onChange={(headers) => setForm({ ...form, headers })}
                keyPlaceholder="Authorization"
                valuePlaceholder="Bearer …"
              />
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary !py-2 !px-4 !text-sm" disabled={saving || !form.name.trim()} onClick={saveServer}>
              <span role="status">{saving ? "Saving..." : form.id ? "Save Changes" : "Add Server"}</span>
            </button>
            <button
              type="button"
              className="btn-ghost !py-2 !px-4 !text-sm"
              disabled={testing === "form"}
              onClick={() =>
                runTest(
                  {
                    server: {
                      id: form.id,
                      name: form.name,
                      transport: form.transport,
                      command: form.transport === "stdio" ? form.command : undefined,
                      args: form.transport === "stdio" ? committedArgs() : undefined,
                      env: form.transport === "stdio" ? rowsToRecord(form.env) : undefined,
                      url: form.transport === "http" ? form.url : undefined,
                      headers: form.transport === "http" ? rowsToRecord(form.headers) : undefined,
                    },
                  },
                  "form",
                )
              }
            >
              {testing === "form" ? "Testing..." : "Test Connection"}
            </button>
            <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={() => setForm(null)}>
              Cancel
            </button>
            {reports.form && (
              <span
                className={`text-xs ${reports.form.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                role="status"
              >
                {reports.form.ok ? `Connected · ${reports.form.toolCount} tools found` : `Error: ${reports.form.error ?? "connection failed"}`}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function KvEditor({
  label,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  label: string;
  rows: KvRow[];
  onChange: (rows: KvRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
      {label}
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className="w-1/3 rounded-lg border border-zinc-300 px-2 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              value={row.key}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))}
              placeholder={keyPlaceholder}
            />
            <input
              className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              value={row.value}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
              placeholder={valuePlaceholder}
            />
            <button
              type="button"
              className="text-xs opacity-60 hover:opacity-100"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`Remove ${row.key || "row"}`}
            >
              <IconX size={12} aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" className="w-fit text-xs text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => onChange([...rows, { key: "", value: "" }])}>
          + Add row
        </button>
      </div>
    </div>
  );
}
