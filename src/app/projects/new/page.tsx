"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { IconFile, IconGlobe, IconPaperclip, IconPencil } from "@/components/icons";

interface BrandProfile {
  brandName: string;
  tagline?: string;
  business: string;
  industry: string;
  usp: string;
  tone: string;
  brandVoice?: string;
  visualStyle?: string;
  audiencePains: string[];
  audienceDesires: string[];
  benefits: string[];
  keyMessages?: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  competitors: string[];
}

type SourceType = "url" | "text" | "file";
type View = "intake" | "extracting" | "review";

const EMPTY: BrandProfile = {
  brandName: "", tagline: "", business: "", industry: "", usp: "", tone: "",
  brandVoice: "", visualStyle: "", audiencePains: [], audienceDesires: [],
  benefits: [], keyMessages: [], wordsToUse: [], wordsToAvoid: [], competitors: [],
};

export default function CreateBrandPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("intake");
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [sourceValue, setSourceValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandProfile>(EMPTY);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brainId, setBrainId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBrainId(crypto.randomUUID()), 0);
    return () => clearTimeout(t);
  }, []);

  const extract = async () => {
    if (!sourceValue.trim()) return;
    setView("extracting");
    setError(null);
    const stages = ["Analyzing source material...", "Identifying brand identity...", "Extracting audience insights...", "Mapping tone and voice...", "Building brand profile..."];
    let idx = 0;
    setProgress(stages[0]);
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setProgress(stages[idx]);
    }, 1200);
    try {
      const res = await fetch("/api/brand-brain/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: sourceType === "file" ? "text" : sourceType, sourceValue: sourceValue.trim() }),
      });
      const data = await res.json() as { brand?: BrandProfile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setBrand({ ...EMPTY, ...(data.brand ?? {}) });
      setView("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setView("intake");
    } finally {
      clearInterval(timer);
    }
  };

  const save = async () => {
    if (!brand.brandName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-brain/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brainId, brand }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(`/studio/${brainId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Your Brands" }} />

      <section className="relative mx-auto max-w-3xl px-8 pb-24 pt-12">
        <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Create New Brand</h1>
        <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
          Tell us about your brand — AI extracts every detail for you to review before saving.
        </p>

        {error && <p className="mt-4 text-sm" style={{ color: "var(--rose)" }}>{error}</p>}

        {view === "extracting" && (
          <div className="glass-hero mt-10 flex flex-col items-center gap-6 py-20 text-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 animate-ping rounded-full" style={{ background: "var(--accent-glow)" }} />
              <div
                className="absolute inset-2 flex items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)", boxShadow: "0 8px 32px -6px var(--accent-glow)" }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 2a5 5 0 015 5c0 2.5-2 4-2 6h-6c0-2-2-3.5-2-6a5 5 0 015-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17h6M10 20h4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>Extracting Brand Intelligence</h2>
            <p className="anim-dot text-sm" style={{ color: "var(--muted)" }}>{progress}</p>
            <div className="h-1.5 w-64 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div className="anim-dot h-full w-3/5 rounded-full" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        )}

        {view === "intake" && (
          <div className="glass-hero anim-rise anim-rise-2 mt-8 p-7">
            {/* Intake tabs */}
            <div className="flex gap-2" role="group" aria-label="Brand source">
              {([
                ["url", <IconGlobe key="g" size={15} />, "Website URL"],
                ["text", <IconPencil key="p" size={15} />, "Paste Text"],
                ["file", <IconFile key="f" size={15} />, "Upload File"],
              ] as Array<[SourceType, React.ReactNode, string]>).map(([t, icon, label]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={sourceType === t}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${sourceType === t ? "" : "btn-ghost !py-1.5"}`}
                  style={sourceType === t ? { background: "var(--accent)", color: "#fff", border: "none" } : undefined}
                  onClick={() => { setSourceType(t); setSourceValue(""); setFileName(null); }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {sourceType === "url" && (
                <label className="field-label">
                  Website URL
                  <input type="url" className="field-input" value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} placeholder="https://yourbrand.com" />
                </label>
              )}
              {sourceType === "text" && (
                <label className="field-label">
                  Describe your brand
                  <textarea className="field-input" rows={8} value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} placeholder="Marketing copy, about page, product descriptions, brand guidelines..." />
                </label>
              )}
              {sourceType === "file" && (
                <div>
                  <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setFileName(f.name);
                      setSourceValue(await f.text());
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition hover:border-[var(--accent)]"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" strokeLinecap="round" />
                    </svg>
                    {fileName ? (
                      <span className="flex items-center gap-1" style={{ color: "var(--accent-bright)" }}>
                        <IconPaperclip size={14} />
                        {fileName}
                      </span>
                    ) : (
                      <span>Click to upload (TXT, MD)</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <button type="button" className="btn-primary mt-6" disabled={!sourceValue.trim()} onClick={extract}>
              Extract Brand Intelligence
            </button>
          </div>
        )}

        {view === "review" && (
          <div className="glass-hero anim-rise mt-8 p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Review & Edit</h2>
              <span className="chip flex items-center gap-1" style={{ borderColor: "var(--accent)", color: "var(--accent-bright)" }}>
                <IconPencil size={13} />
                Editing
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Brand Name
                <input className="field-input !normal-case !tracking-normal" value={brand.brandName} onChange={(e) => setBrand({ ...brand, brandName: e.target.value })} />
              </label>
              <label className="field-label">Tagline
                <input className="field-input !normal-case !tracking-normal" value={brand.tagline ?? ""} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />
              </label>
              <label className="field-label">Industry
                <input className="field-input !normal-case !tracking-normal" value={brand.industry} onChange={(e) => setBrand({ ...brand, industry: e.target.value })} />
              </label>
              <label className="field-label">Tone of Voice
                <input className="field-input !normal-case !tracking-normal" value={brand.tone} onChange={(e) => setBrand({ ...brand, tone: e.target.value })} />
              </label>
            </div>

            <label className="field-label mt-4">Business
              <textarea className="field-input !normal-case !tracking-normal" rows={3} value={brand.business} onChange={(e) => setBrand({ ...brand, business: e.target.value })} />
            </label>
            <label className="field-label mt-3">Unique Selling Proposition
              <textarea className="field-input !normal-case !tracking-normal" rows={3} value={brand.usp} onChange={(e) => setBrand({ ...brand, usp: e.target.value })} />
            </label>

            <ArrayField label="Audience Pains" items={brand.audiencePains} onChange={(v) => setBrand({ ...brand, audiencePains: v })} />
            <ArrayField label="Audience Desires" items={brand.audienceDesires} onChange={(v) => setBrand({ ...brand, audienceDesires: v })} />
            <ArrayField label="Benefits" items={brand.benefits} onChange={(v) => setBrand({ ...brand, benefits: v })} />
            <ArrayField label="Words to Use" items={brand.wordsToUse} onChange={(v) => setBrand({ ...brand, wordsToUse: v })} />
            <ArrayField label="Words to Avoid" items={brand.wordsToAvoid} onChange={(v) => setBrand({ ...brand, wordsToAvoid: v })} />
            <ArrayField label="Competitors" items={brand.competitors} onChange={(v) => setBrand({ ...brand, competitors: v })} />

            <div className="mt-7 flex gap-3">
              <button type="button" className="btn-primary" disabled={saving || !brand.brandName.trim()} onClick={save}>
                {saving ? "Saving..." : "Save & Open Studio"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setView("intake")}>← Back to source</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ArrayField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-3">
      <div className="field-label">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="chip">
            {item}
            <button type="button" className="ml-1 opacity-60 hover:opacity-100" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${item}`}>✕</button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          className="field-input mt-0 !text-xs"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (v && !items.includes(v)) onChange([...items, v]);
              setDraft("");
            }
          }}
          placeholder="Add item"
        />
        <button
          type="button"
          className="btn-ghost shrink-0 px-3 py-2 text-xs"
          onClick={() => {
            const v = draft.trim();
            if (v && !items.includes(v)) onChange([...items, v]);
            setDraft("");
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
