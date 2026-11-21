"use client";

import { useState, useEffect } from "react";
import { ProviderSettingsForm } from "@/features/ai-provider/components/ProviderSettingsForm";
import { BrandBrainSetup } from "@/features/brand-brain/components/BrandBrainSetup";
import { ContentDashboard } from "@/features/content-dashboard/components/ContentDashboard";
import { ComfyUISetup } from "@/features/comfyui/components/ComfyUISetup";

type Step = "configure" | "brand" | "generate";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "configure", label: "Step 1 — AI Provider" },
  { id: "brand", label: "Step 2 — Project / Brand" },
  { id: "generate", label: "Step 3 — Generate" },
];

export function StudioContent() {
  const [step, setStep] = useState<Step>("configure");
  const [brainId, setBrainId] = useState("");
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    // Defer to next microtask so React treats it as a separate render cycle.
    const t = setTimeout(() => setBrainId(crypto.randomUUID()), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Ambient backdrop */}
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[560px]" />
      <div aria-hidden className="glow-orb animate-float left-[-120px] top-[-120px] h-[380px] w-[380px]" />
      <div
        aria-hidden
        className="glow-orb animate-float right-[-140px] top-[40px] h-[420px] w-[420px]"
        style={{ animationDelay: "-5s" }}
      />

      {/* Header */}
      <header className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 pb-10 pt-20 text-center">
        <span className="chip animate-rise">
          <span className="animate-pulse-dot h-2 w-2 rounded-full" style={{ background: "var(--accent-b)" }} />
          AI content studio — Phase 1
        </span>
        <h1
          className="animate-rise text-gradient animate-shimmer text-[clamp(1.5rem,6.4vw,3.75rem)] font-bold tracking-tight"
          style={{ animationDelay: "0.08s" }}
        >
          MySocialMediaInfluencer
        </h1>
        <p
          className="animate-rise max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
          style={{ animationDelay: "0.16s" }}
        >
          Generate on-brand ad copy and social posts with your own local AI model. Research competitors,
          craft angle variants, and move every creative through draft to approval.
        </p>
        <div className="animate-rise flex flex-wrap justify-center gap-2" style={{ animationDelay: "0.24s" }}>
          <span className="chip">Meta — Facebook + Instagram</span>
          <span className="chip">LinkedIn</span>
          <span className="chip">Bring your own model</span>
          <span className="chip">MCP server at /mcp</span>
        </div>
        <a href="#studio" className="btn-primary animate-rise" style={{ animationDelay: "0.32s" }}>
          Open the studio
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </header>

      {/* Step indicator */}
      <nav className="relative mx-auto flex items-center gap-0 px-6 pt-4" aria-label="Steps">
        {STEPS.map(({ id, label }, i) => {
          const isActive = step === id;
          const isDone =
            (id === "configure" && step !== "configure") ||
            (id === "brand" && step === "generate");
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStep(id)}
              className={`group relative flex items-center ${i === 0 ? "pl-1" : ""}`}
            >
              <div className="flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-zinc-100/80 hover:dark:bg-zinc-800/60 dark:hover:bg-zinc-700/40">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-semibold transition-all duration-300 ${
                    isActive
                      ? "border-violet-500 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                      : isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 text-zinc-400 group-hover:border-violet-400 group-hover:text-violet-600 dark:border-zinc-600 dark:group-hover:border-fuchsia-400"
                  }`}
                >
                  {isDone && !isActive ? "✓" : i + 1}
                </span>
                <span
                  className={`transition-all duration-300 ${
                    isActive
                      ? "text-zinc-900 font-semibold dark:text-white"
                      : isDone
                        ? "text-emerald-600 font-medium dark:text-emerald-400"
                        : "text-zinc-500 group-hover:text-violet-600 dark:group-hover:text-fuchsia-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Studio content */}
      <section id="studio" className="relative mx-auto w-full max-w-5xl px-6 pb-20 pt-8">
        <div key={step} className="animate-rise transition-all duration-500">
          {step === "configure" && (
            <div className="flex flex-col gap-6">
              <ProviderSettingsForm onSaved={() => setStep("brand")} />
              <ComfyUISetup />
            </div>
          )}
          {step === "brand" && (
            <BrandBrainSetup
              brainId={brainId}
              onSaved={(brand) => {
                setBrandName(brand.brandName);
                setStep("generate");
              }}
            />
          )}
          {step === "generate" && (
            brandName ? (
              <ContentDashboard brandName={brandName} brainId={brainId} />
            ) : (
              <div className="glass-card p-8 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Select or create a project in Step 2 first to see the content dashboard.
                </p>
                <button type="button" className="btn-primary mt-4" onClick={() => setStep("brand")}>
                  Go to Step 2 — Project / Brand
                </button>
              </div>
            )
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-zinc-200 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        MySocialMediaInfluencer — content generation, research, and approval workflow. More surfaces on the
        way: scheduling, publishing, and LinkedIn ads.
      </footer>
    </main>
  );
}
