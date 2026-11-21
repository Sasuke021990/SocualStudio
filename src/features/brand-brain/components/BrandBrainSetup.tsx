"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BrandExtraction {
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

interface ProjectEntry {
  brainId: string;
  brandName: string;
  fileName: string;
  filePath: string;
  heading: string;
  modifiedAt: string;
  size: number;
}

type SourceType = "url" | "text" | "file";
type ViewMode = "list" | "input" | "extracting" | "edit";

const EMPTY_BRAND: BrandExtraction = {
  brandName: "",
  tagline: "",
  business: "",
  industry: "",
  usp: "",
  tone: "",
  brandVoice: "",
  visualStyle: "",
  audiencePains: [],
  audienceDesires: [],
  benefits: [],
  keyMessages: [],
  wordsToUse: [],
  wordsToAvoid: [],
  competitors: [],
};

export function BrandBrainSetup({ brainId, onSaved }: { brainId: string; onSaved?: (brand: BrandExtraction) => void }) {
  const [view, setView] = useState<ViewMode>("list");
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [sourceValue, setSourceValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandExtraction>(EMPTY_BRAND);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-brain/projects");
      const data = await res.json() as { projects?: ProjectEntry[] };
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
    setProjectsLoaded(true);
  }, []);

  useEffect(() => {
    if (view === "list" && !projectsLoaded) {
      // Defer to avoid synchronous setState in effect body (react-hooks rule)
      const t = setTimeout(() => loadProjects(), 0);
      return () => clearTimeout(t);
    }
  }, [view, projectsLoaded, loadProjects]);

  const startNewBrand = () => {
    setBrand(EMPTY_BRAND);
    setSourceValue("");
    setFileName(null);
    setError(null);
    setView("input");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setSourceValue(text);
  };

  const extract = async () => {
    const trimmed = sourceValue.trim();
    if (!trimmed) return;
    setView("extracting");
    setError(null);
    setProgress("Sending source material to AI for extraction...");

    const stages = [
      "Analyzing source material...",
      "Identifying brand identity...",
      "Extracting audience insights...",
      "Mapping brand tone and voice...",
      "Building brand profile...",
    ];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setProgress(stages[stageIdx]);
    }, 1200);

    try {
      const res = await fetch("/api/brand-brain/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: sourceType === "file" ? "text" : sourceType,
          sourceValue: trimmed,
        }),
      });
      const data = (await res.json()) as { brand?: BrandExtraction; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      if (data.brand) {
        setBrand({ ...EMPTY_BRAND, ...data.brand });
        setView("edit");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setView("input");
    } finally {
      clearInterval(stageTimer);
    }
  };

  const saveBrand = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-brain/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brainId, brand }),
      });
      const data = (await res.json()) as { file?: { fileName: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaving(false);
      onSaved?.(brand);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  // ─── LIST VIEW ───────────────────────────────────────────────
  if (view === "list") {
    return (
      <section className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your Brands & Projects</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Select an existing brand or create a new one to get started.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={startNewBrand}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New Brand
          </button>
        </div>

        {projects.length === 0 && projectsLoaded ? (
          <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950 dark:to-fuchsia-950">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-500">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">No brands yet</p>
              <p className="mt-1 text-sm text-zinc-500">Create your first brand to start generating on-brand content.</p>
            </div>
            <button type="button" className="btn-primary" onClick={startNewBrand}>
              Create Your First Brand
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {projects.map((p) => (
              <button
                key={p.filePath}
                type="button"
                onClick={() => {
                  // Select existing project → advance to Step 3 (Generate)
                  onSaved?.({
                    brandName: p.heading,
                    business: "",
                    industry: "",
                    usp: "",
                    tone: "",
                    audiencePains: [],
                    audienceDesires: [],
                    benefits: [],
                    wordsToUse: [],
                    wordsToAvoid: [],
                    competitors: [],
                  });
                }}
                className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white/60 p-4 text-left transition hover:border-violet-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-fuchsia-500"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                  {p.heading.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">{p.heading}</div>
                  <div className="text-xs text-zinc-500">
                    {p.fileName} · {new Date(p.modifiedAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="chip shrink-0" style={{ borderColor: "#8b5cf6", color: "#8b5cf6" }}>
                  Select →
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ─── EXTRACTING VIEW ─────────────────────────────────────────
  if (view === "extracting") {
    return (
      <section className="glass-card p-8">
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-4xl shadow-lg shadow-violet-500/30">
              🧠
            </div>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Extracting Brand Intelligence</h2>
          <p className="animate-pulse text-sm text-zinc-500">{progress}</p>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: "60%" }} />
          </div>
        </div>
      </section>
    );
  }

  // ─── EDIT VIEW ───────────────────────────────────────────────
  if (view === "edit") {
    return (
      <section className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Review & Edit Brand Profile</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              AI extracted the following details. Review and edit anything before saving.
            </p>
          </div>
          <span className="chip" style={{ borderColor: "#8b5cf6", color: "#8b5cf6" }}>
            ✏️ Editing
          </span>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Basic info */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <EditableField label="Brand Name" value={brand.brandName} onChange={(v) => setBrand({ ...brand, brandName: v })} />
          <EditableField label="Tagline" value={brand.tagline ?? ""} onChange={(v) => setBrand({ ...brand, tagline: v })} placeholder="Optional slogan" />
          <EditableField label="Industry" value={brand.industry} onChange={(v) => setBrand({ ...brand, industry: v })} />
          <EditableField label="Tone of Voice" value={brand.tone} onChange={(v) => setBrand({ ...brand, tone: v })} />
        </div>

        <div className="mt-4">
          <EditableField label="Business Description" value={brand.business} onChange={(v) => setBrand({ ...brand, business: v })} multiline />
        </div>
        <div className="mt-4">
          <EditableField label="Unique Selling Proposition" value={brand.usp} onChange={(v) => setBrand({ ...brand, usp: v })} multiline />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <EditableField label="Brand Voice" value={brand.brandVoice ?? ""} onChange={(v) => setBrand({ ...brand, brandVoice: v })} placeholder="Optional" />
          <EditableField label="Visual Style" value={brand.visualStyle ?? ""} onChange={(v) => setBrand({ ...brand, visualStyle: v })} placeholder="Optional" />
        </div>

        {/* Array fields */}
        <div className="mt-5 space-y-4">
          <ArrayEditor label="Audience Pains" items={brand.audiencePains} onChange={(v) => setBrand({ ...brand, audiencePains: v })} color="red" />
          <ArrayEditor label="Audience Desires" items={brand.audienceDesires} onChange={(v) => setBrand({ ...brand, audienceDesires: v })} color="blue" />
          <ArrayEditor label="Key Benefits" items={brand.benefits} onChange={(v) => setBrand({ ...brand, benefits: v })} color="green" />
          <ArrayEditor label="Key Messages" items={brand.keyMessages ?? []} onChange={(v) => setBrand({ ...brand, keyMessages: v })} color="purple" />
          <ArrayEditor label="Words to Use" items={brand.wordsToUse} onChange={(v) => setBrand({ ...brand, wordsToUse: v })} color="emerald" />
          <ArrayEditor label="Words to Avoid" items={brand.wordsToAvoid} onChange={(v) => setBrand({ ...brand, wordsToAvoid: v })} color="amber" />
          <ArrayEditor label="Competitors" items={brand.competitors} onChange={(v) => setBrand({ ...brand, competitors: v })} color="zinc" />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-primary" disabled={saving || !brand.brandName.trim()} onClick={saveBrand}>
            {saving ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                Saving...
              </>
            ) : (
              "💾 Save Brand & Continue →"
            )}
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setView("input")}
          >
            ← Re-extract
          </button>
        </div>
      </section>
    );
  }

  // ─── INPUT VIEW ──────────────────────────────────────────────
  return (
    <section className="glass-card p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Create New Brand</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Tell us about your brand — paste a URL, upload a document, or describe your project. AI will extract all brand details for you to review before saving.
      </p>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Source type toggle */}
      <div className="mt-4 flex gap-2">
        {(["url", "text", "file"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setSourceType(t); setSourceValue(""); setFileName(null); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              sourceType === t
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
                : "border border-zinc-200 text-zinc-600 hover:border-violet-300 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-fuchsia-400"
            }`}
          >
            {t === "url" ? "🌐 Website URL" : t === "text" ? "✏️ Paste Text" : "📄 Upload File"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {sourceType === "url" && (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Website URL
            <input
              type="url"
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              placeholder="https://yourbrand.com"
            />
          </label>
        )}

        {sourceType === "text" && (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Describe your brand, project, or product
            <textarea
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              rows={8}
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              placeholder="Paste any text about your brand — marketing copy, about page content, product descriptions, brand guidelines..."
            />
          </label>
        )}

        {sourceType === "file" && (
          <div>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.doc,.pdf" onChange={handleFileChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-6 py-8 text-sm text-zinc-500 transition hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:hover:border-fuchsia-400"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" strokeLinecap="round" />
              </svg>
              {fileName ? (
                <span className="font-medium text-violet-600">📎 {fileName}</span>
              ) : (
                <span>Click to upload a document (TXT, MD, DOCX, PDF)</span>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-primary" disabled={!sourceValue.trim()} onClick={extract}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Extract Brand Intelligence
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={() => setView("list")}
        >
          ← Back to list
        </button>
      </div>
    </section>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {label}
      {multiline ? (
        <textarea
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function ArrayEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  color?: string;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="rounded-full p-0.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-700"
              aria-label={`Remove ${item}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="text"
          className="flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder={`Add ${label.toLowerCase()}...`}
        />
        <button
          type="button"
          className="rounded-lg bg-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          onClick={addItem}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
