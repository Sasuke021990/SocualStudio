"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IconCheck, IconPalette, IconPaperclip, IconX } from "@/components/icons";

interface ComfyUIConnection {
  id: string;
  name: string;
  baseUrl: string;
  connected: boolean;
  workflowName: string | null;
  workflowJson: Record<string, unknown> | null;
  lastTestedAt: string | null;
}

interface ComfyUIState {
  connections: ComfyUIConnection[];
  activeId: string | null;
}

interface TestResult {
  ok: boolean;
  message: string;
  version?: string;
}

export function ComfyUISetup() {
  const [connections, setConnections] = useState<ComfyUIConnection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("http://127.0.0.1:8188");
  const [formWorkflowName, setFormWorkflowName] = useState<string | null>(null);
  const [formWorkflowJson, setFormWorkflowJson] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/comfyui");
      const data = (await res.json()) as ComfyUIState;
      setConnections(data.connections ?? []);
      setActiveId(data.activeId);
    } catch { /* keep empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => loadState(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, loadState]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormUrl("http://127.0.0.1:8188");
    setFormWorkflowName(null);
    setFormWorkflowJson(null);
    setTestResult(null);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (c: ComfyUIConnection) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormUrl(c.baseUrl);
    setFormWorkflowName(c.workflowName);
    setFormWorkflowJson(c.workflowJson);
    setTestResult(null);
    setError(null);
    setShowForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      if (typeof json !== "object" || json === null) throw new Error("Not a valid JSON object");
      setFormWorkflowJson(json);
      setFormWorkflowName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON file");
      setFormWorkflowJson(null);
      setFormWorkflowName(null);
    }
  };

  const testConnection = async () => {
    if (editingId) {
      // Test existing connection
      setTesting(true);
      setTestResult(null);
      try {
        const res = await fetch("/api/comfyui", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, baseUrl: formUrl }),
        });
        const data = (await res.json()) as TestResult;
        setTestResult(data);
        loadState();
      } catch (err) {
        setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" });
      } finally {
        setTesting(false);
      }
    } else {
      // Save first, then test
      setTesting(true);
      setTestResult(null);
      try {
        const saveRes = await fetch("/api/comfyui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, baseUrl: formUrl, workflowName: formWorkflowName, workflowJson: formWorkflowJson }),
        });
        const saveData = (await saveRes.json()) as { connection?: ComfyUIConnection; error?: string };
        if (!saveRes.ok) throw new Error(saveData.error ?? "Save failed");
        const id = saveData.connection!.id;
        const res = await fetch("/api/comfyui", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, baseUrl: formUrl }),
        });
        const data = (await res.json()) as TestResult;
        setTestResult(data);
        loadState();
      } catch (err) {
        setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" });
      } finally {
        setTesting(false);
      }
    }
  };

  const saveConnection = async () => {
    setSaving(true);
    setError(null);
    setSaveMsg("");
    try {
      const res = await fetch("/api/comfyui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          name: formName,
          baseUrl: formUrl,
          workflowName: formWorkflowName,
          workflowJson: formWorkflowJson,
        }),
      });
      const data = (await res.json()) as { connection?: ComfyUIConnection; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setShowForm(false);
      setSaveMsg("Connection saved.");
      setTimeout(() => setSaveMsg(""), 2500);
      loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string) => {
    try {
      await fetch("/api/comfyui", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeId: id }),
      });
      loadState();
    } catch { /* ignore */ }
  };

  const deleteConnection = async (id: string) => {
    if (!confirm("Delete this ComfyUI connection?")) return;
    try {
      await fetch("/api/comfyui", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadState();
    } catch { /* ignore */ }
  };

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg">
          <IconPalette size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ComfyUI Image Generation</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect multiple ComfyUI instances — one active connection generates images.
          </p>
        </div>
        <button type="button" className="btn-primary ml-auto !py-2 !px-4 !text-sm" onClick={openNewForm}>
          + Add Connection
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
        {saveMsg}
      </p>

      {/* Connection list */}
      {connections.length === 0 && !showForm ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 py-10 text-center dark:border-zinc-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-600 dark:from-teal-950 dark:to-cyan-950 dark:text-cyan-400">
            <IconPalette size={24} />
          </div>
          <p className="text-sm text-zinc-500">No ComfyUI connections yet. Add one to start generating images.</p>
          <button type="button" className="btn-primary !py-2 !px-4 !text-sm" onClick={openNewForm}>
            Add First Connection
          </button>
        </div>
      ) : connections.length > 0 && (
        <div className="mt-4 space-y-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition ${
                c.id === activeId
                  ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20"
                  : "border-zinc-200 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                c.id === activeId ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-zinc-400 to-zinc-500"
              }`}>
                {c.id === activeId ? "✓" : c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span>
                  {c.id === activeId && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">ACTIVE</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {c.baseUrl} · {c.workflowName ?? "no workflow"}
                  {c.connected && <span className="ml-1 text-emerald-600">● online</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {c.id !== activeId && (
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300"
                    onClick={() => setActive(c.id)}
                  >
                    Set Active
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => openEditForm(c)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => deleteConnection(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/30 p-5 dark:border-violet-800 dark:bg-violet-950/20">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {editingId ? "Edit Connection" : "Add ComfyUI Connection"}
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Connection Name
              <input
                type="text"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Local SDXL, Remote Flux"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              ComfyUI URL
              <input
                type="url"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="http://127.0.0.1:8188"
              />
            </label>
          </div>

          {/* Workflow upload */}
          <div className="mt-3">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Workflow (API.json)
              <span className="ml-2 font-normal text-zinc-500">Export from ComfyUI via &ldquo;Save (API Format)&rdquo;</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2.5 text-xs text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700"
            >
              {formWorkflowName ? (
                <span className="inline-flex items-center gap-1 font-medium text-teal-600 dark:text-cyan-400">
                  <IconPaperclip size={13} />
                  {formWorkflowName} — click to replace
                </span>
              ) : (
                <span>Upload API.json workflow file</span>
              )}
            </button>
            {formWorkflowJson && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {Object.keys(formWorkflowJson).length} nodes detected
              </p>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`mt-3 rounded-lg border p-2.5 text-xs ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"}`}>
              <span className="inline-flex items-center gap-1">
                {testResult.ok ? <IconCheck size={13} /> : <IconX size={13} />}
                {testResult.message}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn-primary !py-2 !px-4 !text-sm"
              disabled={saving || !formName.trim() || !formUrl.trim()}
              onClick={saveConnection}
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Connection"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              disabled={testing || !formUrl.trim()}
              onClick={testConnection}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              className="ml-auto rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
