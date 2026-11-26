"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { exclusivePlay } from "../audio-coordinator";
import { IconMic, IconPlay } from "@/components/icons";

interface VoiceProfile {
  id: string;
  name: string;
  kind: "preset" | "cloned";
  description?: string;
  instruct?: string;
  pitchShift?: number;
  referenceName?: string;
  createdAt: string;
}

interface VoiceState {
  presets: VoiceProfile[];
  cloned: VoiceProfile[];
  engine: { ok: boolean; message: string };
}

export function VoiceSetup() {
  const [presets, setPresets] = useState<VoiceProfile[]>([]);
  const [cloned, setCloned] = useState<VoiceProfile[]>([]);
  const [engine, setEngine] = useState<{ ok: boolean; message: string } | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloneMsg, setCloneMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVoices = useCallback(async () => {
    try {
      const res = await fetch("/api/voice");
      const data = (await res.json()) as VoiceState;
      setPresets(data.presets ?? []);
      setCloned(data.cloned ?? []);
      setEngine(data.engine);
    } catch { /* keep empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => loadVoices(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, loadVoices]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setCloneMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", voiceName.trim() || file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/voice", { method: "POST", body: form });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setVoiceName("");
      setCloneMsg("Voice cloned — ready for your posts.");
      setTimeout(() => setCloneMsg(""), 3000);
      loadVoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const testVoice = async (voiceId: string, name: string) => {
    setTesting(voiceId);
    setError(null);
    try {
      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Namaste! This is ${name}, ready for your social media content.`, voiceId }),
      });
      const data = await res.json() as { audio?: { url: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      if (!data.audio) throw new Error("Voice engine returned no audio — try again");
      if (data.audio) {
        const el = new Audio(data.audio.url);
        exclusivePlay(el);
        el.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice test failed");
    } finally {
      setTesting(null);
    }
  };

  const deleteVoice = async (id: string) => {
    if (!confirm("Delete this cloned voice?")) return;
    try {
      await fetch("/api/voice", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadVoices();
    } catch { /* ignore */ }
  };

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg">
          <IconMic size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Voice Setup</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Clone your voice or pick a preset for post voice-overs.
          </p>
        </div>
        {engine && (
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            engine.ok
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          }`}>
            <span className={`h-2 w-2 rounded-full ${engine.ok ? "bg-emerald-500 animate-pulse-dot" : "bg-amber-500"}`} />
            {engine.message}
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
        {uploading ? "Cloning voice..." : cloneMsg}
      </p>

      {/* Clone your voice */}
      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/30 p-4 dark:border-rose-800 dark:bg-rose-950/20">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Clone Your Voice</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Upload a clear voice sample (WAV, 5-30 seconds recommended). Your voice is cloned and available for all posts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Voice name (e.g. My Voice)"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a,.mp4,.aac"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !text-sm whitespace-nowrap"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              "Cloning..."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <IconMic size={15} />
                Upload &amp; Clone Voice
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cloned voices */}
      {cloned.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your Cloned Voices</h3>
          <div className="mt-2 space-y-2">
            {cloned.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                  <IconMic size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{v.name}</div>
                  <div className="text-xs text-zinc-500">{v.referenceName}</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  disabled={testing === v.id}
                  onClick={() => testVoice(v.id, v.name)}
                >
                  {testing === v.id ? (
                    "Playing..."
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <IconPlay size={11} />
                      Test
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                  onClick={() => deleteVoice(v.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset voices */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Preset Voices</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {presets.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <IconMic size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{v.name}</div>
                <div className="truncate text-xs text-zinc-500">{v.description || v.instruct}</div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                disabled={testing === v.id}
                onClick={() => testVoice(v.id, v.name)}
              >
                {testing === v.id ? (
                  "Playing..."
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <IconPlay size={11} />
                    Test
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
