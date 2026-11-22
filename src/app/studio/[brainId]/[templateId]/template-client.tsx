"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageChrome } from "@/components/nav";
import { CONTENT_TEMPLATES } from "@/features/content-dashboard/types";
import { CONTENT_GOALS, type ContentGoal } from "@/features/content-dashboard/goals";
import type { PostVariation } from "@/features/content-dashboard/variations";
import { InstagramPostCard } from "@/features/content-dashboard/components/InstagramPostCard";
import { acquireGenerationLock, releaseGenerationLock } from "@/features/content-dashboard/generation-lock";
import { useGenerationLocked } from "@/features/content-dashboard/useGenerationLock";

interface Voice { id: string; name: string; kind: string }
interface Tool { id: string; name: string }

function GoalIcon({ id, emoji }: { id: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-2xl">{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/goals/${id}.png?v=2`}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function TemplateClient() {
  const params = useParams<{ brainId: string; templateId: string }>();
  const router = useRouter();
  const brainId = params.brainId;
  const tpl = CONTENT_TEMPLATES.find((t) => t.id === params.templateId);

  const [brandName, setBrandName] = useState("");
  const [goal, setGoal] = useState<ContentGoal | null>(null);
  const [customText, setCustomText] = useState("");
  const [topic, setTopic] = useState("");
  const [variations, setVariations] = useState<PostVariation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState<string | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, { image?: string | null; voiceAudio?: string | null; sfxAudio?: string | null }>>({});
  const abortRef = useRef<AbortController | null>(null);
  const anyGenerating = useGenerationLocked();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand-brain/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { projects?: Array<{ brainId: string; heading: string }> }) => {
        if (!cancelled) setBrandName(d.projects?.find((p) => p.brainId === brainId)?.heading ?? "Brand");
      }).catch(() => {});
    fetch("/api/comfyui").then((r) => r.json()).then((d: { connections?: Tool[]; activeId?: string }) => {
      if (!cancelled) {
        setTools(d.connections ?? []);
        setToolId(d.activeId ?? null);
      }
    }).catch(() => {});
    fetch("/api/voice").then((r) => r.json()).then((d: { presets?: Voice[]; cloned?: Voice[] }) => {
      if (!cancelled) setVoices([...(d.cloned ?? []), ...(d.presets ?? [])]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [brainId]);

  const handleMediaChange = useCallback((id: string, media: { image?: string | null; voiceAudio?: string | null; sfxAudio?: string | null }) => {
    setMediaMap((prev) => ({ ...prev, [id]: { ...prev[id], ...media } }));
  }, []);

  const generate = async () => {
    if (!tpl || !goal || generating) return;
    if (goal.id === "custom" && !customGoalTextReady()) return;
    if (!acquireGenerationLock("tpl-batch")) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setError(null);
    setVariations([]);
    setSelectedIds(new Set());

    const goalPrompt = goal.id === "custom" ? customText.trim() : goal.promptSuffix;
    try {
      const res = await fetch("/api/content-dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          brandName,
          topic: topic.trim(),
          platform: tpl.platform,
          contentType: tpl.label,
          count: 5,
          goalPrompt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("Empty response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: sd } = await reader.read();
        if (sd) done = true;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          for (const line of event.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("data:"))) {
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(payload) as { phase?: string; variation?: PostVariation; error?: string };
              if (parsed.phase) setGenPhase(parsed.phase);
              if (parsed.variation) setVariations((prev) => [...prev, parsed.variation!]);
              if (parsed.error) setError(parsed.error);
            } catch { /* skip */ }
          }
          if (done) break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") setGenPhase("Stopped");
      else setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGenPhase("");
      abortRef.current = null;
      releaseGenerationLock("tpl-batch");
    }
  };

  const customGoalTextReady = () => customText.trim().length > 0;

  const saveSelected = async () => {
    if (!tpl || selectedIds.size === 0 || saving) return;
    setSaving(true);
    try {
      for (const v of variations.filter((x) => selectedIds.has(x.id))) {
        const media = mediaMap[v.id] ?? {};
        await fetch("/api/content-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName,
            brainId,
            type: tpl.id,
            title: v.caption.slice(0, 80) || tpl.label,
            prompt: tpl.defaultPrompt.replace("{topic}", topic),
            output: v.caption,
            platform: tpl.platform,
            variation: {
              imageConcept: v.imageConcept as unknown as Record<string, string>,
              soundPrompt: v.soundPrompt ?? "",
              caption: v.caption,
              hashtags: v.hashtags,
              cta: v.cta,
              generatedImage: media.image ?? null,
              voiceAudio: media.voiceAudio ?? null,
              sfxAudio: media.sfxAudio ?? null,
            },
          }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!tpl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p style={{ color: "var(--muted)" }}>Template not found.</p>
        <button type="button" className="btn-primary" onClick={() => router.push(`/studio/${brainId}`)}>Back to Studio</button>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: `/studio/${brainId}`, label: "Studio" }} brand={brandName} />

      <section className="mx-auto max-w-6xl px-8 pb-24 pt-12">
        <div className="anim-rise flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {tpl.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tpl.label}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{tpl.platform} · {brandName}</p>
          </div>
        </div>

        {/* Goal grid */}
        <h2 className="anim-rise anim-rise-1 mt-10 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          What kind of post do you want?
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {CONTENT_GOALS.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={`glass anim-rise anim-rise-${(i % 4) + 1} flex flex-col items-center gap-2 p-4 text-center transition ${goal?.id === g.id ? "" : "card-hover"}`}
              style={goal?.id === g.id ? { borderColor: "var(--accent)", boxShadow: "0 8px 28px -8px var(--accent-glow)" } : undefined}
              onClick={() => setGoal(g)}
            >
              <span
                className="flex h-16 w-full items-center justify-center overflow-hidden rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.10))",
                  border: "1px solid rgba(99,102,241,0.30)",
                }}
              >
                <GoalIcon id={g.id} emoji={g.icon} />
              </span>
              <span className="text-xs font-semibold">{g.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>{g.description}</span>
            </button>
          ))}
        </div>

        {/* Custom goal */}
        {goal?.id === "custom" && (
          <textarea
            className="field-input anim-rise mt-4 !normal-case !tracking-normal"
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Describe exactly what you want... e.g., 'Funny meme-style post about Monday blues for a streetwear audience'"
          />
        )}

        {/* Generate strip */}
        {goal && (
          <div className="glass anim-rise mt-6 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="field-input !normal-case !tracking-normal"
                style={{ maxWidth: 360 }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Optional topic — e.g. 'summer sale launch'"
              />
              <button
                type="button"
                className="btn-primary"
                disabled={generating || (goal.id === "custom" && !customGoalTextReady()) || (anyGenerating && !generating)}
                onClick={generate}
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none" /></svg>
                    Generating...
                  </>
                ) : variations.length === 0 ? "✨ Create 5 Posts" : "🔄 Generate 5 More"}
              </button>
              {generating && (
                <button type="button" className="btn-ghost !border-[var(--rose)]" style={{ color: "var(--rose)" }} onClick={() => abortRef.current?.abort()}>
                  ■ Stop
                </button>
              )}
              {selectedIds.size > 0 && (
                <button type="button" className="btn-primary" disabled={saving} onClick={saveSelected}>
                  {saving ? "Saving..." : saved ? "✓ Saved" : `💾 Save ${selectedIds.size} to Drafts`}
                </button>
              )}
              {tools.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Image tool:</span>
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="chip transition"
                      style={toolId === t.id ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : undefined}
                      onClick={() => setToolId(t.id)}
                    >
                      🎨 {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {generating && genPhase && (
              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--accent-bright)" }}>
                <span className="anim-dot h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                {genPhase}
              </div>
            )}
            {error && <p className="mt-3 text-sm" style={{ color: "var(--rose)" }}>{error}</p>}
          </div>
        )}

        {/* Generated cards */}
        {variations.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {variations.map((v) => (
              <InstagramPostCard
                key={v.id}
                variation={v}
                selected={selectedIds.has(v.id)}
                onToggleSelect={() => setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
                  return next;
                })}
                brandName={brandName}
                toolId={toolId}
                voices={voices}
                onMediaChange={handleMediaChange}
              />
            ))}
          </div>
        )}

        {goal && variations.length === 0 && !generating && (
          <div className="glass mt-8 flex flex-col items-center gap-4 py-16 text-center">
            <div
              className="flex h-18 w-18 items-center justify-center rounded-2xl text-4xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow: "0 4px 18px -6px var(--accent-glow)",
              }}
            >
              {goal.icon}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#fff" }}>Hit &ldquo;Create 5 Posts&rdquo;</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                AI generates 5 unique {tpl.label.toLowerCase()} variations — previewed exactly as they&apos;d look on {tpl.platform}.
              </p>
            </div>
          </div>
        )}

        {/* Tips strip */}
        <div className="glass anim-rise mt-10 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
            Tips for {tpl.label}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              "Goals tune the tone: Launch builds hype, Engagement drives comments, Education earns saves.",
              "The image brief follows the caption's exact message — the visual always matches the words.",
              "Generate a few batches, cherry-pick the best, save them to Drafts for finishing touches.",
            ].map((tip, i) => (
              <li key={tip} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
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
