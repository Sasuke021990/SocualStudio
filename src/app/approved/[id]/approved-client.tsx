"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ContentItem } from "@/features/content-dashboard/types";
import { exclusivePlay } from "@/features/voice/audio-coordinator";

export default function ApprovedClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<ContentItem[]>([]);
  const [current, setCurrent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content-dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { items?: ContentItem[] }) => {
        if (cancelled) return;
        const all = (data.items ?? []).filter((i) => i.status === "approved");
        setPosts(all);
        setCurrent(all.find((i) => i.id === params.id) ?? all[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [params.id]);

  const selectPost = (item: ContentItem) => {
    setCurrent(item);
    router.replace(`/approved/${item.id}`);
  };

  const exportWorkspace = async () => {
    if (!current || exporting) return;
    setExporting(true);
    setExportError(null);
    setExportResult(null);
    try {
      const res = await fetch("/api/content-dashboard/export-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: current.id }),
      });
      const data = await res.json() as { folder?: { path: string; files: string[] }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Export failed");
      setExportResult(`Saved to ${data.folder!.path} (${data.folder!.files.join(", ")})`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading approved posts...</div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">No approved posts.</p>
        <Link href="/approved" className="btn-primary">Back to Approved</Link>
      </main>
    );
  }

  const v = current.variation;
  const handle = current.brandName.toLowerCase().replace(/\s+/g, "");

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      {/* Back nav */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8">
        <Link
          href="/approved"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/60 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-violet-300 hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"
        >
          ← Back to Approved
        </Link>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 text-xs font-semibold text-white">
              ✓ Approved · {current.brandName}
            </span>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
              disabled={exporting}
              onClick={exportWorkspace}
            >
              {exporting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                  Exporting...
                </>
              ) : (
                "📁 Export Workspace Folder"
              )}
            </button>
          </div>
          {exportError && <p className="max-w-md text-right text-[11px] text-red-500">{exportError}</p>}
          {exportResult && <p className="max-w-md text-right text-[11px] text-emerald-600 break-all">{exportResult}</p>}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        {/* SIDEBAR: approved posts */}
        <aside className="flex flex-col gap-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Approved Posts ({posts.length})
          </h3>
          <div className="space-y-2">
            {posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPost(p)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  p.id === current.id
                    ? "border-emerald-400 bg-emerald-50/60 shadow-md dark:border-emerald-600 dark:bg-emerald-950/30"
                    : "border-zinc-200 bg-white/60 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900/60"
                }`}
              >
                <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">{p.title}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                  <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 font-semibold text-white">
                    {p.brandName}
                  </span>
                  {p.platform}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN: post preview */}
        <section className="mx-auto w-full" style={{ maxWidth: 420 }}>
          <div className="overflow-hidden rounded-2xl border-2 border-zinc-200 dark:border-zinc-700" style={{ background: "#fff" }}>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
                {current.brandName.charAt(0).toUpperCase()}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#262626" }}>{handle}</div>
            </div>

            <div className="relative flex aspect-square items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              {v?.generatedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.generatedImage} alt="post" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="relative z-10 px-6 text-center text-white">
                  <div className="text-4xl">📸</div>
                  <p className="mt-2 text-xs opacity-80">{current.title}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" className="ml-auto"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            <div className="px-3.5 pb-1">
              <p className="text-[13px] font-semibold" style={{ color: "#262626" }}>248 likes</p>
            </div>
            <div className="px-3.5 pb-2">
              <p className="text-[13px] leading-[18px]" style={{ color: "#262626" }}>
                <span className="font-semibold">{handle}</span> {v?.caption ?? current.title}
              </p>
            </div>
            {v?.hashtags && v.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 px-3.5 pb-2">
                {v.hashtags.map((tag, i) => (
                  <span key={i} className="text-[12px]" style={{ color: "#00376b" }}>#{tag}</span>
                ))}
              </div>
            )}
            {v?.cta && (
              <div className="px-3.5 pb-3">
                <div className="w-full rounded-lg py-2 text-center text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }}>
                  {v.cta}
                </div>
              </div>
            )}
            {(v?.voiceAudio || v?.sfxAudio) && (
              <div className="border-t border-zinc-100 px-3.5 py-2 space-y-1.5">
                {v.voiceAudio && <audio controls src={v.voiceAudio} className="h-8 w-full" preload="none" onPlay={(e) => exclusivePlay(e.currentTarget)} />}
                {v.sfxAudio && <audio controls src={v.sfxAudio} className="h-8 w-full" preload="none" onPlay={(e) => exclusivePlay(e.currentTarget)} />}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
