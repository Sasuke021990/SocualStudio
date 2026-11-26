"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { IconFile, IconGlobe, IconPaperclip, IconPencil, IconX } from "@/components/icons";
import type { BrandBrain2Profile } from "@/features/brand-brain/types";

type SourceType = "url" | "text" | "file";
type View = "intake" | "extracting" | "review";

const EMPTY_PROFILE: BrandBrain2Profile = {
  brandName: "",
  tagline: "",
  business: "",
  industry: "",
  usp: "",
  mission: "",
  founderPersona: "",
  demographics: {
    targetRoles: [],
    ageBracket: "20-40",
    geography: "Global / India",
  },
  audiencePains: [],
  audienceDesires: [],
  objections: [],
  visualStyle: "Modern Clean High-Tech",
  colorPalette: {
    primary: "#0A0F1D",
    secondary: "#6366F1",
    accent: "#06B6D4",
  },
  lightingStyle: "Dramatic studio volumetric rim lighting",
  compositionStyle: "Centered cinematic subject, shallow depth of field",
  imagePromptKeywords: [],
  voicePersona: "Confident young tech founder, upbeat pacing",
  recommendedVoiceId: "preset-energetic-host",
  soundBedGenre: "808 Trending Trap / Drill",
  soundBedBpm: 138,
  contentPillars: [],
  viralHookAngles: [],
  wordsToUse: [],
  wordsToAvoid: [],
  competitors: [],
  coreOffers: [],
  pricingModel: "Freemium",
  primaryCta: "Link in bio",
};

export default function CreateBrandPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("intake");
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [sourceValue, setSourceValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandBrain2Profile>(EMPTY_PROFILE);
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
    const stages = [
      "Analyzing source material & documents...",
      "Extracting core identity & USP...",
      "Mapping visual aesthetics & color palettes (ComfyUI)...",
      "Analyzing voice persona & Ming-TTS profile...",
      "Structuring content pillars & viral hooks...",
      "Finalizing Brand Brain 2.0 intelligence...",
    ];
    let idx = 0;
    setProgress(stages[0]);
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setProgress(stages[idx]);
    }, 1500);

    try {
      const res = await fetch("/api/brand-brain/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceValue: sourceValue.trim(),
          fileName: fileName || undefined,
        }),
      });
      const data = (await res.json()) as { brand?: BrandBrain2Profile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setBrand({ ...EMPTY_PROFILE, ...(data.brand ?? {}) });
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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      // Guaranteed navigation to Studio
      window.location.href = `/studio/${brainId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const isBinary = f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx");

    const reader = new FileReader();
    if (isBinary) {
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:*/*;base64, prefix
        const base64 = result.split(",")[1] || result;
        setSourceValue(base64);
      };
      reader.readAsDataURL(f);
    } else {
      reader.onload = () => {
        setSourceValue((reader.result as string) || "");
      };
      reader.readAsText(f);
    }
  };

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Your Brands" }} />

      <section className="relative mx-auto max-w-4xl px-6 pb-24 pt-12 sm:px-8">
        <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>
          Create New Brand
        </h1>
        <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
          Extract comprehensive multi-modal brand intelligence to power on-brand content, vertical reels, images, and voiceovers.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

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
            <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>Extracting Brand Brain 2.0 Intelligence</h2>
            <p className="anim-dot text-sm" style={{ color: "var(--muted)" }}>{progress}</p>
            <div className="h-1.5 w-64 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div className="anim-dot h-full w-3/5 rounded-full" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        )}

        {view === "intake" && (
          <div className="glass-hero anim-rise anim-rise-2 mt-8 p-7">
            <div className="flex gap-2" role="group" aria-label="Brand source">
              {([
                ["url", <IconGlobe key="g" size={15} />, "Website URL"],
                ["text", <IconPencil key="p" size={15} />, "Paste Text"],
                ["file", <IconFile key="f" size={15} />, "Upload File (PDF / DOCX / TXT)"],
              ] as Array<[SourceType, React.ReactNode, string]>).map(([t, icon, label]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={sourceType === t}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${sourceType === t ? "" : "btn-ghost !py-1.5"}`}
                  style={sourceType === t ? { background: "var(--accent)", color: "#fff", border: "none" } : undefined}
                  onClick={() => {
                    setSourceType(t);
                    setSourceValue("");
                    setFileName(null);
                  }}
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
                  <input
                    type="url"
                    className="field-input"
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder="https://yourbrand.com"
                  />
                </label>
              )}
              {sourceType === "text" && (
                <label className="field-label">
                  Describe your brand or paste copy
                  <textarea
                    className="field-input"
                    rows={8}
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder="Paste about page, pitch deck copy, product description, or marketing guidelines..."
                  />
                </label>
              )}
              {sourceType === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileUpload}
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
                      <span className="flex items-center gap-1 font-medium" style={{ color: "var(--accent-bright)" }}>
                        <IconPaperclip size={14} />
                        {fileName} (Ready to extract)
                      </span>
                    ) : (
                      <span>Click to upload Brand PDF, DOCX, TXT, or MD</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-primary mt-6 cursor-pointer"
              disabled={!sourceValue.trim()}
              onClick={extract}
            >
              Extract Brand Intelligence
            </button>
          </div>
        )}

        {view === "review" && (
          <div className="glass-hero anim-rise mt-8 space-y-6 p-7">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Review & Fine-Tune Brand Brain</h2>
                <p className="text-xs text-muted-foreground" style={{ color: "var(--muted)" }}>
                  Verified multi-modal profile used across Content Studio, Reels, Image Generation, and Audio.
                </p>
              </div>
              <span className="chip flex items-center gap-1" style={{ borderColor: "var(--accent)", color: "var(--accent-bright)" }}>
                <IconPencil size={13} />
                Editing
              </span>
            </div>

            {/* 1. Core Brand Identity */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-indigo-400 uppercase">1. Core Brand Identity</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Brand Name
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.brandName}
                    onChange={(e) => setBrand({ ...brand, brandName: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Tagline
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.tagline ?? ""}
                    onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Industry
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.industry}
                    onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Pricing Model
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.pricingModel ?? ""}
                    onChange={(e) => setBrand({ ...brand, pricingModel: e.target.value })}
                  />
                </label>
              </div>

              <label className="field-label">
                Business Description
                <textarea
                  className="field-input !normal-case !tracking-normal"
                  rows={3}
                  value={brand.business}
                  onChange={(e) => setBrand({ ...brand, business: e.target.value })}
                />
              </label>

              <label className="field-label">
                Unique Selling Proposition (USP)
                <textarea
                  className="field-input !normal-case !tracking-normal"
                  rows={3}
                  value={brand.usp}
                  onChange={(e) => setBrand({ ...brand, usp: e.target.value })}
                />
              </label>
            </div>

            {/* 2. Visual & Art Direction (ComfyUI) */}
            <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase">2. Visual & Art Direction (ComfyUI)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Visual Style
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.visualStyle}
                    onChange={(e) => setBrand({ ...brand, visualStyle: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Lighting Style
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.lightingStyle}
                    onChange={(e) => setBrand({ ...brand, lightingStyle: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="field-label">
                  Primary Color (HEX)
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                      value={brand.colorPalette.primary.startsWith("#") ? brand.colorPalette.primary : "#0A0F1D"}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, primary: e.target.value } })
                      }
                    />
                    <input
                      className="field-input !mt-0 !py-1 !text-xs"
                      value={brand.colorPalette.primary}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, primary: e.target.value } })
                      }
                    />
                  </div>
                </label>
                <label className="field-label">
                  Secondary Color (HEX)
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                      value={brand.colorPalette.secondary.startsWith("#") ? brand.colorPalette.secondary : "#6366F1"}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, secondary: e.target.value } })
                      }
                    />
                    <input
                      className="field-input !mt-0 !py-1 !text-xs"
                      value={brand.colorPalette.secondary}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, secondary: e.target.value } })
                      }
                    />
                  </div>
                </label>
                <label className="field-label">
                  Accent Color (HEX)
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                      value={brand.colorPalette.accent.startsWith("#") ? brand.colorPalette.accent : "#06B6D4"}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, accent: e.target.value } })
                      }
                    />
                    <input
                      className="field-input !mt-0 !py-1 !text-xs"
                      value={brand.colorPalette.accent}
                      onChange={(e) =>
                        setBrand({ ...brand, colorPalette: { ...brand.colorPalette, accent: e.target.value } })
                      }
                    />
                  </div>
                </label>
              </div>

              <ArrayField
                label="Image Prompt Keywords (Injected into ComfyUI)"
                items={brand.imagePromptKeywords}
                onChange={(v) => setBrand({ ...brand, imagePromptKeywords: v })}
              />
            </div>

            {/* 3. Audio & Voice Identity (Ming-TTS & SFX) */}
            <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold tracking-wider text-purple-400 uppercase">3. Audio & Voice Profile (Ming-TTS)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Recommended Ming-TTS Voice
                  <select
                    className="field-input !normal-case !tracking-normal cursor-pointer"
                    value={brand.recommendedVoiceId}
                    onChange={(e) => setBrand({ ...brand, recommendedVoiceId: e.target.value })}
                  >
                    <option value="preset-energetic-host">Kabir - Energetic Host (Upbeat Tech Founder / Viral)</option>
                    <option value="preset-professional">Pooja - Professional (Articulate Corporate Businesswoman)</option>
                    <option value="preset-friendly">Rohan - Casual Creator (Relatable Conversational English)</option>
                    <option value="preset-warm-narrator">Aditi - Warm Narrator (Calm, Trustworthy Indian Woman)</option>
                    <option value="preset-storyteller">Vikram - Storyteller (Deep, Expressive & Dramatic)</option>
                  </select>
                </label>
                <label className="field-label">
                  Voice Persona & Tone
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.voicePersona}
                    onChange={(e) => setBrand({ ...brand, voicePersona: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Sound Bed Genre
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.soundBedGenre}
                    onChange={(e) => setBrand({ ...brand, soundBedGenre: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  Recommended BPM
                  <input
                    type="number"
                    className="field-input !normal-case !tracking-normal"
                    value={brand.soundBedBpm}
                    onChange={(e) => setBrand({ ...brand, soundBedBpm: parseInt(e.target.value) || 138 })}
                  />
                </label>
              </div>
            </div>

            {/* 4. Target Audience */}
            <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold tracking-wider text-rose-400 uppercase">4. Target Audience Insights</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="field-label">
                  Target Roles
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.demographics.targetRoles.join(", ")}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        demographics: {
                          ...brand.demographics,
                          targetRoles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder="e.g. Developers, Designers, Founders"
                  />
                </label>
                <label className="field-label">
                  Age Bracket
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.demographics.ageBracket}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        demographics: { ...brand.demographics, ageBracket: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  Geography
                  <input
                    className="field-input !normal-case !tracking-normal"
                    value={brand.demographics.geography}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        demographics: { ...brand.demographics, geography: e.target.value },
                      })
                    }
                  />
                </label>
              </div>

              <ArrayField
                label="Audience Pains"
                items={brand.audiencePains}
                onChange={(v) => setBrand({ ...brand, audiencePains: v })}
              />
              <ArrayField
                label="Audience Desires"
                items={brand.audienceDesires}
                onChange={(v) => setBrand({ ...brand, audienceDesires: v })}
              />
              <ArrayField
                label="Key Objections"
                items={brand.objections}
                onChange={(v) => setBrand({ ...brand, objections: v })}
              />
            </div>

            {/* 5. Content Strategy */}
            <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold tracking-wider text-amber-400 uppercase">5. Content Strategy & Pillars</h3>
              <ArrayField
                label="Content Pillars (4-6 core topics)"
                items={brand.contentPillars}
                onChange={(v) => setBrand({ ...brand, contentPillars: v })}
              />
              <ArrayField
                label="Proven Viral Hook Angles"
                items={brand.viralHookAngles}
                onChange={(v) => setBrand({ ...brand, viralHookAngles: v })}
              />
              <ArrayField
                label="Words to Use (Brand Vocabulary)"
                items={brand.wordsToUse}
                onChange={(v) => setBrand({ ...brand, wordsToUse: v })}
              />
              <ArrayField
                label="Words to Avoid (Negative Words)"
                items={brand.wordsToAvoid}
                onChange={(v) => setBrand({ ...brand, wordsToAvoid: v })}
              />
              <ArrayField
                label="Competitors"
                items={brand.competitors}
                onChange={(v) => setBrand({ ...brand, competitors: v })}
              />
            </div>

            {/* 6. Offer & CTA */}
            <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">6. Offers & Call to Action</h3>
              <ArrayField
                label="Core Offers & Products"
                items={brand.coreOffers}
                onChange={(v) => setBrand({ ...brand, coreOffers: v })}
              />
              <label className="field-label">
                Primary Call to Action (CTA)
                <input
                  className="field-input !normal-case !tracking-normal"
                  value={brand.primaryCta}
                  onChange={(e) => setBrand({ ...brand, primaryCta: e.target.value })}
                />
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                className="btn-primary cursor-pointer px-6 py-2.5"
                disabled={saving || !brand.brandName.trim()}
                onClick={save}
              >
                {saving ? "Saving & Redirecting..." : "Save & Open Studio"}
              </button>
              <button
                type="button"
                className="btn-ghost cursor-pointer"
                disabled={saving}
                onClick={() => setView("intake")}
              >
                ← Back to source
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ArrayField({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-3">
      <div className="field-label">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="chip">
            {item}
            <button
              type="button"
              className="ml-1 cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove ${item}`}
            >
              <IconX size={12} aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          className="field-input mt-0 !text-xs !normal-case !tracking-normal"
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
          className="btn-ghost shrink-0 cursor-pointer px-3 py-2 text-xs"
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
