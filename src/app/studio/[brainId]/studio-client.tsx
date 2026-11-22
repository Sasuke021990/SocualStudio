"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { DeleteBrandDialog } from "@/components/DeleteBrandDialog";
import { DraftCard, EmptyState } from "@/components/content-widgets";
import { CONTENT_TEMPLATES } from "@/features/content-dashboard/types";
import type { ContentItem } from "@/features/content-dashboard/types";

const TIPS = [
  "Each template generates 5 unique variations — captions, image briefs, and sound descriptions matched to each other.",
  "Pick a goal first: 25 goal types from Launch to Meme. Custom lets you describe exactly what you want.",
  "Generated images come from your own ComfyUI workflows — set them up in Settings → Image Generation.",
];

function TemplateIcon({ id, emoji }: { id: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="text-3xl">{emoji}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/templates/${id}.png?v=2`}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function StudioClient() {
  const params = useParams<{ brainId: string }>();
  const router = useRouter();
  const brainId = params.brainId;
  const [brandName, setBrandName] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-dashboard?brainId=${encodeURIComponent(brainId)}`, { cache: "no-store" });
      const data = await res.json() as { items?: ContentItem[] };
      setItems(data.items ?? []);
    } catch { /* empty */ }
    setItemsLoaded(true);
  }, [brainId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand-brain/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { projects?: Array<{ brainId: string; heading: string }> }) => {
        if (!cancelled) {
          setBrandName(data.projects?.find((p) => p.brainId === brainId)?.heading ?? "Brand");
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [brainId]);

  useEffect(() => {
    const t = setTimeout(() => loadItems(), 0);
    return () => clearTimeout(t);
  }, [loadItems]);

  const drafts = items.filter((i) => i.status !== "approved");

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Your Brands" }} brand={brandName} />

      <section className="relative mx-auto max-w-6xl px-8 pb-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>
              Create New Content
            </h1>
            <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
              Pick a template to generate platform-optimized content{brandName ? ` for ${brandName}` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/brand/${brainId}`} className="btn-ghost anim-rise anim-rise-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Brand page
            </Link>
            <DeleteBrandDialog
              brandName={brandName || "this brand"}
              triggerLabel="Delete Brand"
              triggerClassName="btn-ghost cursor-pointer transition-colors duration-200"
              confirmLabel="Delete Brand"
              description="This removes the brand profile and all its draft posts. Approved posts are kept and stay visible on the Approved page until you remove them manually."
              onConfirm={async () => {
                const res = await fetch(`/api/brand-brain/${encodeURIComponent(brainId)}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ includeApproved: false }),
                });
                const data = await res.json() as { error?: string };
                if (!res.ok) throw new Error(data.error ?? "Delete failed");
                router.push("/dashboard");
              }}
            />
          </div>
        </div>

        {/* Template grid */}
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {CONTENT_TEMPLATES.map((tpl, i) => (
            <Link
              key={tpl.id}
              href={`/studio/${brainId}/${tpl.id}`}
              className={`glass card-hover anim-rise anim-rise-${(i % 4) + 1} flex flex-col items-start gap-3 p-5`}
            >
              <div
                className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.10))",
                  border: "1px solid rgba(99,102,241,0.30)",
                }}
              >
                <TemplateIcon id={tpl.id} emoji={tpl.icon} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#fff" }}>{tpl.label}</div>
                <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{tpl.platform}</div>
              </div>
              <div className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{tpl.description}</div>
            </Link>
          ))}
        </div>

        {/* Draft Insta Posts */}
        <div className="glass anim-rise mt-10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Draft Insta Posts</h2>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{drafts.length} in progress</span>
          </div>
          {!itemsLoaded ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => <div key={i} className="glass h-20 animate-pulse" />)}
            </div>
          ) : drafts.length === 0 ? (
            <EmptyState
              title="No drafts yet"
              hint="Pick a template above, generate posts, and save them here for finishing touches."
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

        {/* Tips strip */}
        <div className="glass anim-rise mt-10 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
            How it works
          </h3>
          <ul className="mt-4 space-y-3">
            {TIPS.map((tip, i) => (
              <li key={tip} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
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
