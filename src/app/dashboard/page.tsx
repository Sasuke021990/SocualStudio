"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageChrome } from "@/components/nav";
import { StatCard } from "@/components/content-widgets";
import type { ContentItem } from "@/features/content-dashboard/types";

interface ProjectEntry {
  brainId: string;
  brandName: string;
  heading: string;
  fileName: string;
  modifiedAt: string;
}

interface BrandRow extends ProjectEntry {
  approved: number;
  total: number;
}

function brandInitial(heading: string): string {
  return heading.charAt(0).toUpperCase() || "B";
}

export default function DashboardPage() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [totals, setTotals] = useState({ approved: 0, total: 0 });
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projRes, itemRes] = await Promise.all([
        fetch("/api/brand-brain/projects", { cache: "no-store" }),
        fetch("/api/content-dashboard", { cache: "no-store" }),
      ]);
      const projData = await projRes.json() as { projects?: ProjectEntry[] };
      const itemData = await itemRes.json() as { items?: ContentItem[] };
      const items = itemData.items ?? [];
      const rows: BrandRow[] = (projData.projects ?? []).map((p) => {
        const mine = items.filter((i) => i.brainId === p.brainId);
        return {
          ...p,
          total: mine.length,
          approved: mine.filter((i) => i.status === "approved").length,
        };
      });
      setBrands(rows);
      setTotals({
        total: items.length,
        approved: items.filter((i) => i.status === "approved").length,
      });
    } catch {
      /* empty */
    }
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
      <PageChrome back={{ href: "/", label: "Landing" }} />

      <section className="relative mx-auto max-w-6xl px-8 pb-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Command Dashboard</h1>
            <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
              Every brand at a glance — approved posts ready to publish, and one click to the full picture.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/approved" className="btn-ghost anim-rise anim-rise-2">Approved Posts</Link>
            <Link href="/projects/new" className="btn-primary anim-rise anim-rise-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New Brand
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Brands" value={brands.length} delay={1}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 2a5 5 0 015 5c0 2.5-2 4-2 6h-6c0-2-2-3.5-2-6a5 5 0 015-5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 17h6M10 20h4" strokeLinecap="round" />
            </svg>
          </StatCard>
          <StatCard label="Approved" value={totals.approved} delay={2}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StatCard>
        </div>

        <h2 className="anim-rise anim-rise-2 mt-12 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
          Brands
        </h2>

        {!loaded ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="glass h-36 animate-pulse" />)}
          </div>
        ) : brands.length === 0 ? (
          <div className="glass-hero mt-6 flex flex-col items-center gap-5 py-16 text-center">
            <p className="text-lg font-semibold" style={{ color: "#fff" }}>No brands yet</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Create a brand and its content will show up here.</p>
            <Link href="/projects/new" className="btn-primary">Create Your First Brand</Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((b, i) => (
              <Link
                key={b.brainId}
                href={`/brand/${b.brainId}`}
                className={`glass card-hover anim-rise anim-rise-${(i % 4) + 1} cursor-pointer p-6`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{
                      background: "linear-gradient(120deg, var(--accent), #a855f7)",
                      boxShadow: "0 4px 18px -4px var(--accent-glow)",
                    }}
                  >
                    {brandInitial(b.heading)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold" style={{ color: "#fff" }}>{b.heading}</div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      Updated {new Date(b.modifiedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl py-2" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                    <div className="text-lg font-bold" style={{ color: "#fff" }}>{b.total}</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Posts</div>
                  </div>
                  <div className="rounded-xl py-2" style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)" }}>
                    <div className="text-lg font-bold" style={{ color: "#fff" }}>{b.approved}</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Approved</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-1 text-xs" style={{ color: "var(--accent-bright)" }}>
                  Open brand workspace
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="glass anim-rise mt-12 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/projects" className="btn-ghost">Your Brands</Link>
            <Link href="/approved" className="btn-ghost">Approved Posts</Link>
            <Link href="/projects/new" className="btn-ghost">New Brand</Link>
            <Link href="/settings" className="btn-ghost">Settings</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
