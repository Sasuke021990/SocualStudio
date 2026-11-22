"use client";

import { useState, useEffect, useCallback } from "react";
import { IconFolder } from "@/components/icons";

export function WorkspaceSetup() {
  const [exportPath, setExportPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      const data = await res.json() as { config?: { exportPath: string } };
      if (data.config) setExportPath(data.config.exportPath);
    } catch { /* keep empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => loadConfig(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, loadConfig]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportPath }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg">
          <IconFolder size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Workspace</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose the folder where exported posts are saved (image, voice, sound, caption).
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
        {saving ? "Saving..." : saved ? "Settings saved." : ""}
      </p>

      <div className="mt-4 flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Workspace folder path
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              placeholder="C:\path\to\your\workspace"
            />
            <button
              type="button"
              className="btn-primary whitespace-nowrap !py-2 !px-4 !text-sm"
              disabled={saving || !exportPath.trim()}
              onClick={save}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Each exported post creates a subfolder here with image.png, voice.wav, sound.wav, caption.txt, README.md.
      </p>
    </section>
  );
}
