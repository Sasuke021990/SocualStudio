"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { DeleteBrandDialog } from "@/components/DeleteBrandDialog";
import { StatCard, DraftCard, EmptyState } from "@/components/content-widgets";
import type { ContentItem } from "@/features/content-dashboard/types";

interface ProjectEntry {
  brainId: string;
  brandName: string;
  heading: string;
  fileName: string;
  modifiedAt: string;
}

export default function BrandClient() {
  const params = useParams<{ brainId: string }>();
  const router = useRouter();
  const brainId = params.brainId;
  const [brand, setBrand] = useState<ProjectEntry | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [projRes, itemRes] = await Promise.all([
        fetch("/api/brand-brain/projects", { cache: "no-store" }),
        fetch(`/api/content-dashboard?brainId=${encodeURIComponent(brainId)}`, { cache: "no-store" }),
      ]);
      const projData = await projRes.json() as { projects?: ProjectEntry[] };
      const itemData = await itemRes.json() as { items?: ContentItem[] };
      setBrand(projData.projects?.find((p) => p.brainId === brainId) ?? null);
      setItems(itemData.items ?? []);
    } catch { /* empty */ }
  }, [brainId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const drafts = items.filter((i) => i.status !== "approved");
  const heading = brand?.heading ?? "Brand";

  const deleteBrand = async () => {
    const res = await fetch(`/api/brand-brain/${encodeURIComponent(brainId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeApproved: false }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Delete failed");
    router.push("/dashboard");
  };

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/dashboard", label: "Dashboard" }} brand={heading} />

      <section className="relative mx-auto max-w-6xl px-8 pb-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href={`/studio/${brainId}`} className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>
              {heading}
            </Link>
            <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
              Everything for this brand — drafts to finish, creation tools, and one click to the full picture.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/studio/${brainId}`} className="btn-primary anim-rise anim-rise-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Open Studio
            </Link>
            <DeleteBrandDialog
              brandName={heading}
              triggerLabel="Delete Brand"
              triggerClassName="btn-ghost cursor-pointer transition-colors duration-200"
              confirmLabel="Delete Brand"
              description="This removes the brand profile and all its draft posts. Approved posts are kept and stay visible on the Approved page until you remove them manually."
              onConfirm={deleteBrand}
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Posts" value={items.length} delay={1}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StatCard>
          <StatCard label="Drafts" value={drafts.length} delay={2}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StatCard>
        </div>

        <div className="glass anim-rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Brand profile</div>
            <div className="mt-1 text-sm" style={{ color: "#fff" }}>{brand?.fileName ?? `${heading.toLowerCase().replace(/\s+/g, "-")}.md`}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Last updated</div>
            <div className="mt-1 text-sm" style={{ color: "#fff" }}>
              {brand ? new Date(brand.modifiedAt).toLocaleString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Workflow</div>
            <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Generate in Studio → finish in Workspace → approve in Approved → publish manually.
            </div>
          </div>
          <Link href={`/studio/${brainId}`} className="btn-ghost ml-auto">Create content</Link>
        </div>

        {/* Draft Insta Posts */}
        <div className="glass anim-rise mt-8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Draft Insta Posts</h2>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{drafts.length} in progress</span>
          </div>
          {drafts.length === 0 ? (
            <EmptyState
              title="No drafts yet"
              hint="Generate posts in the Studio and save them here for finishing touches."
              action={<Link href={`/studio/${brainId}`} className="btn-primary">Open Studio</Link>}
            />
          ) : (
            <div className="mt-4 space-y-3">
              {drafts.map((item) => (
                <DraftCard
                  key={item.id}
                  item={item}
                  onChanged={(next) => setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)))}
                  onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
