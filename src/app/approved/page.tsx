"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageChrome } from "@/components/nav";
import { DeleteBrandDialog } from "@/components/DeleteBrandDialog";
import { ApprovedCard } from "@/components/content-widgets";
import type { ContentItem } from "@/features/content-dashboard/types";

interface ProjectEntry {
  brainId: string;
  heading: string;
}

interface BrandSection {
  brandName: string;
  brainIds: string[];
  liveBrainId: string | null;
  archived: boolean;
  items: ContentItem[];
}

export default function ApprovedPage() {
  const [sections, setSections] = useState<BrandSection[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projRes, itemRes] = await Promise.all([
        fetch("/api/brand-brain/projects", { cache: "no-store" }),
        fetch("/api/content-dashboard", { cache: "no-store" }),
      ]);
      const projData = await projRes.json() as { projects?: ProjectEntry[] };
      const itemData = await itemRes.json() as { items?: ContentItem[] };
      const liveByName = new Map((projData.projects ?? []).map((p) => [p.heading.toLowerCase(), p.brainId]));
      const byBrand = new Map<string, BrandSection>();
      for (const item of (itemData.items ?? []).filter((i) => i.status === "approved")) {
        const key = item.brandName || "Unnamed brand";
        const existing = byBrand.get(key);
        if (existing) {
          existing.items.push(item);
          if (!existing.brainIds.includes(item.brainId)) existing.brainIds.push(item.brainId);
        } else {
          const liveBrainId = liveByName.get(key.toLowerCase()) ?? null;
          byBrand.set(key, {
            brandName: key,
            brainIds: [item.brainId],
            liveBrainId,
            archived: !liveBrainId,
            items: [item],
          });
        }
      }
      setSections([...byBrand.values()].sort((a, b) => a.brandName.localeCompare(b.brandName)));
    } catch { /* empty */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => load(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, load]);

  const removeSection = (section: BrandSection) => async () => {
    for (const brainId of section.brainIds) {
      const res = await fetch(`/api/brand-brain/${encodeURIComponent(brainId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeApproved: true }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
    }
    setSections((prev) => prev.filter((s) => s !== section));
  };

  const totalApproved = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/dashboard", label: "Dashboard" }} />

      <section className="relative mx-auto max-w-6xl px-8 pb-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Approved Posts</h1>
            <p className="anim-rise anim-rise-1 mt-2 max-w-2xl" style={{ color: "var(--muted)" }}>
              Every approved post, grouped by brand. Nothing here is ever removed automatically —
              even after a brand is deleted, its approved posts stay until you remove them manually.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip anim-rise anim-rise-2">{totalApproved} approved</span>
            <Link href="/projects" className="btn-ghost anim-rise anim-rise-2">Your Brands</Link>
          </div>
        </div>

        {!loaded ? (
          <div className="mt-10 space-y-8">
            {[0, 1].map((i) => <div key={i} className="glass h-40 animate-pulse" />)}
          </div>
        ) : sections.length === 0 ? (
          <div className="glass-hero mt-12 flex flex-col items-center gap-5 py-20 text-center">
            <p className="text-lg font-semibold" style={{ color: "#fff" }}>No approved posts yet</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Approve drafts from a brand&apos;s Studio and they will collect here.
            </p>
            <Link href="/projects" className="btn-primary">Go to Your Brands</Link>
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.brandName} className="glass anim-rise p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{
                      background: "linear-gradient(120deg, var(--accent), #a855f7)",
                      boxShadow: "0 4px 18px -4px var(--accent-glow)",
                    }}
                  >
                    {section.brandName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: "#fff" }}>
                      {section.brandName}
                      {section.archived && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)" }}>
                          archived
                        </span>
                      )}
                    </h2>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      {section.items.length} approved {section.items.length === 1 ? "post" : "posts"}
                      {section.archived && " · brand deleted, kept by design"}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {!section.archived && section.liveBrainId && (
                      <Link href={`/brand/${section.liveBrainId}`} className="text-xs transition-colors duration-200 hover:underline" style={{ color: "var(--accent-bright)" }}>
                        Open brand →
                      </Link>
                    )}
                    <DeleteBrandDialog
                      brandName={section.brandName}
                      triggerLabel="Remove brand & posts"
                      triggerClassName="btn-ghost cursor-pointer px-4 py-2 text-xs transition-colors duration-200"
                      confirmLabel="Remove permanently"
                      description={`Removes ${section.brandName} and all its approved posts (${section.items.length}) from this workspace. This cannot be undone.`}
                      onConfirm={removeSection(section)}
                    />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <ApprovedCard key={item.id} item={item} archived={section.archived} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
