"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { CONTENT_TEMPLATES } from "@/features/content-dashboard/types";

const TIPS = [
  "Each template generates 5 unique variations — captions, image briefs, and sound descriptions matched to each other.",
  "Pick a goal first: 25 post types from Launch to Meme. Custom lets you describe exactly what you want.",
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
  const brainId = params.brainId;
  const [brandName, setBrandName] = useState("");

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

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Projects" }} brand={brandName} />

      <section className="relative mx-auto max-w-6xl px-8 pb-24 pt-12">
        <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>
          Create New Content
        </h1>
        <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
          Pick a template to generate platform-optimized content{brandName ? ` for ${brandName}` : ""}.
        </p>

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
