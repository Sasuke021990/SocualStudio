"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AD_PLATFORMS, type AdPlatform } from "../../ad-generation/types";
import type { CalendarItem } from "../types";

interface CalendarItemListResponse {
  calendarItems: CalendarItem[];
}

export function CalendarPanel() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [form, setForm] = useState({ brandBrainId: "", date: "", platforms: ["meta"] as AdPlatform[], content: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/content-calendar")
      .then((res) => res.json())
      .then((data: CalendarItemListResponse) => {
        if (data?.calendarItems) {
          setItems(data.calendarItems);
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
      const res = await fetch("/api/content-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { calendarItem?: CalendarItem; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create calendar item");
      }
      setStatus("saved");
      setForm({ brandBrainId: "", date: "", platforms: ["meta"], content: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create calendar item");
      setStatus("error");
    }
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/content-calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (!res.ok) {
      setError("Failed to approve calendar item");
      return;
    }
    load();
  };

  const togglePlatform = (platform: AdPlatform) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Content Calendar</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Draft calendar items for approved content.</p>
      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Brand ID
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.brandBrainId} onChange={(e) => setForm({ ...form, brandBrainId: e.target.value })} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Date
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
        </div>
        <fieldset className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <legend>Platforms</legend>
          {AD_PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 font-normal">
              <input type="checkbox" className="rounded" checked={form.platforms.includes(platform)} onChange={() => togglePlatform(platform)} />
              {platform}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Content
          <textarea className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900" disabled={status === "saving"}>
          {status === "saving" ? "Creating..." : "Create calendar item"}
        </button>
        {status === "saved" && <p className="text-sm text-emerald-600 dark:text-emerald-400">Calendar item created.</p>}
        {status === "error" && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
      <ul className="mt-4 flex flex-col gap-2">
        {items.length === 0 && <li className="text-sm text-zinc-500">No calendar items yet.</li>}
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.date}</span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">{item.status}</span>
            </div>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">{item.content}</p>
            {item.status === "draft" && (
              <button type="button" className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700" onClick={() => handleApprove(item.id)}>
                Approve
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
