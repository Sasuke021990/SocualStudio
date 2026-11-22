"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageChrome } from "@/components/nav";
import type { ContentItem } from "@/features/content-dashboard/types";

export default function DraftsPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/content-dashboard", { cache: "no-store" });
      const data = await res.json() as { items?: ContentItem[] };
      setItems((data.items ?? []).filter((i) => i.status === "draft"));
    } catch { /* empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => load(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, load]);

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Projects" }} />

      <section className="relative mx-auto max-w-4xl px-8 pb-24 pt-12">
        <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Draft Insta Posts</h1>
        <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
          Click a post to open its workspace and edit everything.
        </p>

        {!loaded ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="glass h-20 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-hero mt-10 flex flex-col items-center gap-4 py-16 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.25))", boxShadow: "0 8px 28px -8px var(--accent-glow)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>No drafts yet. Generate and save posts from a brand studio.</p>
            <Link href="/projects" className="btn-primary">Go to Projects</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((item, i) => (
              <Link
                key={item.id}
                href={`/workspace/${item.id}`}
                className={`glass card-hover anim-rise anim-rise-${(i % 4) + 1} flex items-center gap-4 p-5`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: "#fff" }}>{item.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <span className="chip brand-chip !py-0.5 !text-[10px]">{item.brandName}</span>
                    {item.platform} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-sm" style={{ color: "var(--accent-bright)" }}>Open Workspace →</span>
              </Link>
            ))}
          </div>
        )}

        {/* Tips strip */}
        <div className="glass anim-rise mt-10 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
            Draft workflow
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              "Open a draft to edit caption, hashtags, CTA, and regenerate image, voice, or sound.",
              "All media saves with the post — nothing lost between sessions or restarts.",
              "Happy with the result? Mark it Approved to unlock workspace export.",
            ].map((tip, i) => (
              <li key={tip} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
