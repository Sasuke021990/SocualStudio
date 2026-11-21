"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AD_PLATFORMS, type AdPlatform } from "../../ad-generation/types";
import type { ResearchItem } from "../types";

interface ResearchItemListResponse {
  researchItems: ResearchItem[];
}

export function ResearchPanel() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [form, setForm] = useState<{ platform: AdPlatform; sourceUrl: string; sourceAd: string }>({
    platform: "meta",
    sourceUrl: "",
    sourceAd: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/research")
      .then((res) => res.json())
      .then((data: ResearchItemListResponse) => {
        if (data?.researchItems) {
          setItems(data.researchItems);
        }
      })
      .catch(() => {
        // Ignore load errors; keep the current list.
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          sourceUrl: form.sourceUrl || undefined,
          sourceAd: form.sourceAd,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { researchItem?: ResearchItem; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create research item");
      }
      setStatus("saved");
      setForm({ platform: "meta", sourceUrl: "", sourceAd: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create research item");
      setStatus("error");
    }
  };

  const handleAnalyze = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/research/${id}/analyze`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { researchItem?: ResearchItem; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateBeat = async (id: string, beatIndex: number) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/research/${id}/beats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatIndex }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create ad variant");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad variant");
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to approve research item");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve research item");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Competitor Steal &amp; Beat
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Capture a competitor ad, let the AI explain why it works, generate stronger beats, then create and approve ad variants.
      </p>
      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Platform
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as AdPlatform })}
            >
              {AD_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Source URL (optional)
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://facebook.com/ads/library/..."
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Competitor ad copy
          <textarea
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            rows={3}
            value={form.sourceAd}
            onChange={(e) => setForm({ ...form, sourceAd: e.target.value })}
            placeholder="Paste the competitor's ad text here..."
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={status === "saving"}
        >
          {status === "saving" ? "Capturing..." : "Capture competitor ad"}
        </button>
        {status === "saved" && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Research item captured.</p>
        )}
      </form>
      {status === "error" && error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {status !== "error" && error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {items.length === 0 && <li className="text-sm text-zinc-500">No research items yet.</li>}
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {item.platform}
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-blue-600 underline dark:text-blue-400"
                  >
                    source
                  </a>
                )}
              </span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">{item.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{item.sourceAd}</p>
            {item.findings && (
              <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Findings</h3>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{item.findings}</p>
              </div>
            )}
            {item.beatVariants.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Beat variants</h3>
                {item.beatVariants.map((beat, index) => (
                  <div key={index} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-zinc-700 dark:text-zinc-300">{beat.primaryText}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{beat.headline}</p>
                    <p className="text-zinc-500 dark:text-zinc-500">{beat.cta}</p>
                    {item.status === "analyzed" && (
                      <button
                        type="button"
                        className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-60 dark:border-zinc-700"
                        disabled={busyId === item.id}
                        onClick={() => handleCreateBeat(item.id, index)}
                      >
                        Create ad variant
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status === "planned" && (
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-60 dark:border-zinc-700"
                  disabled={busyId === item.id}
                  onClick={() => handleAnalyze(item.id)}
                >
                  {busyId === item.id ? "Analyzing..." : "Analyze with AI"}
                </button>
              )}
              {(item.status === "created" || item.status === "analyzed") &&
                item.createdAdVariantIds.length > 0 && (
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-60 dark:border-zinc-700"
                    disabled={busyId === item.id}
                    onClick={() => handleApprove(item.id)}
                  >
                    {busyId === item.id ? "Approving..." : "Approve workflow"}
                  </button>
                )}
              {item.status === "approved" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  Approved — {item.createdAdVariantIds.length} ad variant(s) approved.
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
