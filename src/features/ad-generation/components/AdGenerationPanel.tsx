"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AD_PLATFORMS, META_AD_LIMITS, type AdPlatform, type AdVariant } from "../types";

interface AdVariantListResponse {
  adVariants: AdVariant[];
}

const EMPTY_FORM = {
  brandBrainId: "",
  platform: "meta" as AdPlatform,
  objective: "",
  format: "static-image",
  angle: "",
  primaryText: "",
  headline: "",
  description: "",
  cta: "",
};

export function AdGenerationPanel() {
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState({ brandBrainId: "", platform: "meta" as AdPlatform, objective: "", format: "static-image", angles: "" });
  const [aiStatus, setAiStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/ad-variants")
      .then((res) => res.json())
      .then((data: AdVariantListResponse) => {
        if (data?.adVariants) {
          setVariants(data.adVariants);
        }
      })
      .catch(() => {
        // Ignore load errors; keep the current list.
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/ad-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          brandBrainId: form.brandBrainId || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { adVariant?: AdVariant; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create ad variant");
      }
      setStatus("saved");
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad variant");
      setStatus("error");
    }
  };

  const handleAiGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAiStatus("generating");
    setAiError(null);
    try {
      const angles = aiForm.angles.split(",").map((a) => a.trim()).filter(Boolean);
      const res = await fetch("/api/ad-variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandBrainId: aiForm.brandBrainId || null,
          platform: aiForm.platform,
          objective: aiForm.objective,
          format: aiForm.format,
          angles,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        adVariants?: AdVariant[];
        failures?: Array<{ angle: string; error: string }>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "AI generation failed");
      }
      setAiStatus("done");
      setAiForm((prev) => ({ ...prev, angles: "" }));
      if (data.failures && data.failures.length > 0) {
        setAiError(`Some angles failed: ${data.failures.map((f) => f.angle).join(", ")}`);
      }
      load();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI generation failed");
      setAiStatus("error");
    }
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/ad-variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (!res.ok) {
      setError("Failed to approve ad variant");
      return;
    }
    load();
  };

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setAiField = (field: keyof typeof aiForm, value: string) => {
    setAiForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Meta Ad Generation</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Draft ad copy variants. Approve to move them into the research→create→approve workflow.
      </p>
      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Brand ID (optional)
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={form.brandBrainId}
              onChange={(e) => setField("brandBrainId", e.target.value)}
              placeholder="brand-id"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Platform
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={form.platform}
              onChange={(e) => setField("platform", e.target.value)}
            >
              {AD_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Objective
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.objective} onChange={(e) => setField("objective", e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Format
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.format} onChange={(e) => setField("format", e.target.value)} required />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Angle
          <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.angle} onChange={(e) => setField("angle", e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Primary text
          <textarea className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" rows={2} value={form.primaryText} onChange={(e) => setField("primaryText", e.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Headline
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.headline} onChange={(e) => setField("headline", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            CTA
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.cta} onChange={(e) => setField("cta", e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Description
          <textarea className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" rows={2} value={form.description} onChange={(e) => setField("description", e.target.value)} />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900" disabled={status === "saving"}>
          {status === "saving" ? "Creating..." : "Create ad variant"}
        </button>
        {status === "saved" && <p className="text-sm text-emerald-600 dark:text-emerald-400">Ad variant created.</p>}
        {status === "error" && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
      <form className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800" onSubmit={handleAiGenerate}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Generate with AI</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          One ad variant per angle. Separate multiple angles with commas (up to 8 per request).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Brand ID (optional)
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={aiForm.brandBrainId}
              onChange={(e) => setAiField("brandBrainId", e.target.value)}
              placeholder="brand-id"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Platform
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={aiForm.platform}
              onChange={(e) => setAiField("platform", e.target.value)}
            >
              {AD_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Objective
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={aiForm.objective} onChange={(e) => setAiField("objective", e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Format
            <input className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={aiForm.format} onChange={(e) => setAiField("format", e.target.value)} required />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Angles (comma-separated)
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={aiForm.angles}
            onChange={(e) => setAiField("angles", e.target.value)}
            placeholder="pain point, social proof, urgency"
            required
          />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900" disabled={aiStatus === "generating"}>
          {aiStatus === "generating" ? "Generating..." : "Generate variants"}
        </button>
        {aiStatus === "done" && !aiError && <p className="text-sm text-emerald-600 dark:text-emerald-400">Variants generated.</p>}
        {aiError && <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>}
      </form>
      <ul className="mt-4 flex flex-col gap-2">
        {variants.length === 0 && <li className="text-sm text-zinc-500">No ad variants yet.</li>}
        {variants.map((variant) => (
          <li key={variant.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{variant.platform}</span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">{variant.status}</span>
            </div>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">{variant.primaryText}</p>
            <p className="text-zinc-600 dark:text-zinc-400">{variant.headline}</p>
            <p className="text-zinc-500 dark:text-zinc-500">{variant.cta}</p>
            {variant.status === "draft" && (
              <button type="button" className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700" onClick={() => handleApprove(variant.id)}>
                Approve
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Meta limits — primaryText: {META_AD_LIMITS.primaryText}, headline: {META_AD_LIMITS.headline}, description: {META_AD_LIMITS.description} chars.
      </p>
    </section>
  );
}
