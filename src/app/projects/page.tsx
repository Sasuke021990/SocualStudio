"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageChrome } from "@/components/nav";
import { DeleteBrandDialog } from "@/components/DeleteBrandDialog";

interface ProjectEntry {
  brainId: string;
  brandName: string;
  heading: string;
  fileName: string;
  modifiedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-brain/projects", { cache: "no-store" });
      const data = await res.json() as { projects?: ProjectEntry[] };
      setProjects(data.projects ?? []);
    } catch { /* empty */ }
    setLoaded(true);
  }, []);

  const deleteBrand = (brainId: string) => async () => {
    const res = await fetch(`/api/brand-brain/${encodeURIComponent(brainId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeApproved: false }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Delete failed");
    setProjects((prev) => prev.filter((p) => p.brainId !== brainId));
  };

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
      <PageChrome back={{ href: "/", label: "Home" }} />

      <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Your Brands</h1>
            <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
              Select a brand to open its Studio, or create a new one.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost anim-rise anim-rise-2">Dashboard</Link>
            <Link href="/projects/new" className="btn-primary anim-rise anim-rise-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New Brand
            </Link>
          </div>
        </div>

        {!loaded ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-32 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-hero mt-12 flex flex-col items-center gap-5 py-20 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.25))",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow: "0 8px 28px -8px var(--accent-glow)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "#fff" }}>No brands yet</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Create your first brand to start generating on-brand content.
              </p>
            </div>
            <Link href="/projects/new" className="btn-primary">Create Your First Brand</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <div key={`${p.brainId}-${p.fileName}`} className={`glass card-hover anim-rise anim-rise-${(i % 4) + 1} flex items-center gap-4 p-5`}>
                <Link href={`/studio/${p.brainId}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{
                      background: "linear-gradient(120deg, var(--accent), #a855f7)",
                      boxShadow: "0 4px 18px -4px var(--accent-glow)",
                    }}
                  >
                    {p.heading.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold" style={{ color: "#fff" }}>{p.heading}</div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(p.modifiedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <svg className="ml-auto shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent-bright)" strokeWidth="1.8" aria-hidden>
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Link
                    href={`/brand/${p.brainId}`}
                    className="text-xs transition-colors duration-200 hover:underline"
                    style={{ color: "var(--accent-bright)" }}
                  >
                    Brand page
                  </Link>
                  <DeleteBrandDialog
                    brandName={p.heading}
                    triggerLabel="Delete"
                    triggerClassName="cursor-pointer text-xs transition-colors duration-200 hover:underline"
                    confirmLabel="Delete Brand"
                    description="This removes the brand profile and all its draft posts. Approved posts are kept and stay visible on the Approved page until you remove them manually."
                    onConfirm={deleteBrand(p.brainId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
