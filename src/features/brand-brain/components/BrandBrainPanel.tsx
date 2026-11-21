"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { BrandBrain } from "../types";

interface BrandBrainListResponse {
  brandBrains: BrandBrain[];
}

export function BrandBrainPanel() {
  const [brains, setBrains] = useState<BrandBrain[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/brand-brain")
      .then((res) => res.json())
      .then((data: BrandBrainListResponse) => {
        if (data?.brandBrains) {
          setBrains(data.brandBrains);
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
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/brand-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { brandBrain?: BrandBrain; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create brand");
      }
      setStatus("saved");
      setSourceUrl("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
      setStatus("error");
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Brand</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Add a brand source URL to start building its brand profile.
      </p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={status === "saving"}
        >
          {status === "saving" ? "Creating..." : "Create brand"}
        </button>
      </form>
      {status === "saved" && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">Brand created.</p>}
      {status === "error" && error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {brains.length === 0 && <li className="text-sm text-zinc-500">No brands yet.</li>}
        {brains.map((brain) => (
          <li key={brain.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <span className="font-medium">{brain.sourceUrl}</span>
            <span className="ml-2 text-xs uppercase tracking-wide text-zinc-500">{brain.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
