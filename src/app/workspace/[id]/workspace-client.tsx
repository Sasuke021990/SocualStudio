"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ContentItem, ContentStatus } from "@/features/content-dashboard/types";
import { BackPill } from "@/components/nav";
import { IconImage, IconSpark } from "@/components/icons";
import { assembleImagePrompt } from "@/features/content-dashboard/variations";
import { exclusivePlay } from "@/features/voice/audio-coordinator";
import { acquireGenerationLock, releaseGenerationLock } from "@/features/content-dashboard/generation-lock";
import { useGenerationLocked } from "@/features/content-dashboard/useGenerationLock";
import { reelSpecSchema, type ReelSpec } from "@/features/reel/schemas";

interface Voice {
  id: string;
  name: string;
  kind: string;
}

interface Tool {
  id: string;
  name: string;
}

export default function WorkspaceClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [cta, setCta] = useState("");
  const [soundPrompt, setSoundPrompt] = useState("");
  const [imageConcept, setImageConcept] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Media
  const [image, setImage] = useState<{ url: string } | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState<string | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [audio, setAudio] = useState<{ url: string } | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [sfx, setSfx] = useState<{ soundPrompt: string; audio: { url: string } } | null>(null);
  const [generatingSfx, setGeneratingSfx] = useState(false);
  const [sfxError, setSfxError] = useState<string | null>(null);
  const anyGenerating = useGenerationLocked();

  // Reel
  const [reelPrompt, setReelPrompt] = useState(
    "Punchy reel — hook in the first 2 seconds, one idea per line, emotional payoff, soft CTA at the end.",
  );
  const [reelSpec, setReelSpec] = useState<ReelSpec | null>(null);
  const [specDraft, setSpecDraft] = useState("");
  const [hookScore, setHookScore] = useState<number | null>(null);
  const [planState, setPlanState] = useState<"idle" | "planning" | "planned">("idle");
  const [planAccepted, setPlanAccepted] = useState(false);
  const [reelError, setReelError] = useState<string | null>(null);
  const [reelDuration, setReelDuration] = useState<15 | 30>(15);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [imageCountPick, setImageCountPick] = useState<1 | 2 | 3>(3);
  const [showGenModal, setShowGenModal] = useState(false);
  const [reelPhase, setReelPhase] = useState("");
  const [reelMeta, setReelMeta] = useState<{ videoFile: string; imageFiles: string[]; createdAt: string } | null>(null);
  const [cardView, setCardView] = useState<"image" | "reel">("image");

  const readOnly = item?.status === "approved";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/content-dashboard`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { items?: ContentItem[] }) => {
        if (cancelled) return;
        const found = (data.items ?? []).find((i) => i.id === id) ?? null;
        setItem(found);
        if (found?.variation) {
          setCaption(found.variation.caption);
          setHashtags(found.variation.hashtags);
          setCta(found.variation.cta);
          setSoundPrompt(found.variation.soundPrompt);
          setImageConcept(found.variation.imageConcept ?? {});
          if (found.variation.generatedImage) setImage({ url: found.variation.generatedImage });
          if (found.variation.voiceAudio) setAudio({ url: found.variation.voiceAudio });
          if (found.variation.sfxAudio) setSfx({ soundPrompt: found.variation.soundPrompt, audio: { url: found.variation.sfxAudio } });
          if (found.variation.reelSpec) {
            setReelSpec(found.variation.reelSpec);
            setSpecDraft(found.variation.reelSpec.narration);
            setReelDuration(found.variation.reelSpec.durationSeconds);
            setPlanState("planned");
            setPlanAccepted(true);
          }
          if (found.variation.reel) {
            setReelMeta(found.variation.reel);
            setCardView("reel");
          }
        } else if (found) {
          setCaption(found.output);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

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
  }, [id]);

  const buildVariation = () => ({
    imageConcept,
    soundPrompt,
    caption,
    hashtags,
    cta,
    // Omit absent media — a stale tab's save must never wipe assets generated
    // elsewhere (regeneration overwrites; there is no delete-media action).
    ...(image?.url ? { generatedImage: image.url } : {}),
    ...(audio?.url ? { voiceAudio: audio.url } : {}),
    ...(sfx?.audio.url ? { sfxAudio: sfx.audio.url } : {}),
    ...(reelSpec ? { reelSpec } : {}),
    ...(reelMeta ? { reel: reelMeta } : {}),
  });

  const buildOutput = () =>
    `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}\n\nCTA: ${cta}${soundPrompt ? `\n\nSound: ${soundPrompt}` : ""}`;

  const save = async () => {
    setSaving(true);
    await fetch("/api/content-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, output: buildOutput(), variation: buildVariation() }),
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  // ── Reel ─────────────────────────────────────────────────────────────

  const generatePlan = async (imageCount: 1 | 2 | 3) => {
    setShowImagePopup(false);
    setPlanState("planning");
    setReelError(null);
    try {
      const res = await fetch("/api/reel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, prompt: reelPrompt, durationSeconds: reelDuration, imageCount }),
      });
      const data = (await res.json()) as { spec?: ReelSpec; hookScore?: number; error?: string };
      if (!res.ok || !data.spec) throw new Error(data.error ?? "Planning failed");
      setReelSpec(data.spec);
      setSpecDraft(data.spec.narration);
      setHookScore(data.hookScore ?? null);
      setPlanAccepted(false);
      setPlanState("planned");
    } catch (err) {
      setPlanState("idle");
      setReelError(err instanceof Error ? err.message : "Planning failed");
    }
  };

  const usePlan = async () => {
    if (!reelSpec) return;
    const candidate = { ...reelSpec, narration: specDraft.trim() };
    const parsedSpec = reelSpecSchema.safeParse(candidate);
    if (!parsedSpec.success) {
      setReelError(parsedSpec.error.issues[0]?.message ?? "Invalid script");
      return;
    }
    setReelError(null);
    setReelSpec(parsedSpec.data);
    setPlanAccepted(true);
    await fetch("/api/content-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, variation: { ...buildVariation(), reelSpec: parsedSpec.data } }),
    }).catch(() => {});
  };

  const generateReel = async () => {
    if (!reelSpec || !planAccepted) return;
    if (!acquireGenerationLock(`reel-${id}`)) return;
    setShowGenModal(true);
    setReelPhase("Starting…");
    setReelError(null);
    try {
      const res = await fetch("/api/reel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, connectionId: toolId ?? undefined }),
      });
      const start = (await res.json()) as { job?: string; error?: string };
      if (!res.ok || !start.job) throw new Error(start.error ?? `Request failed (${res.status})`);
      for (let i = 0; i < 360; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const st = (await (await fetch(`/api/reel/job?job=${start.job}`, { cache: "no-store" })).json()) as {
          phase?: string;
          done?: { videoUrl: string };
          error?: string;
        };
        if (st.phase) setReelPhase(st.phase);
        if (st.error) throw new Error(st.error);
        if (st.done) {
          setReelMeta({ videoFile: "reel.mp4", imageFiles: [], createdAt: new Date().toISOString() });
          setCardView("reel");
          return;
        }
      }
      throw new Error("Reel generation timed out");
    } catch (err) {
      setReelError(err instanceof Error ? err.message : "Reel generation failed");
    } finally {
      setShowGenModal(false);
      setReelPhase("");
      releaseGenerationLock(`reel-${id}`);
    }
  };

  const markApproved = async () => {
    setSaving(true);
    await fetch("/api/content-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, output: buildOutput(), variation: buildVariation() }),
    });
    await fetch("/api/content-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved" as ContentStatus }),
    });
    setSaving(false);
    router.push("/approved");
  };

  const generateImage = async () => {
    if (generatingImage) return;
    if (!acquireGenerationLock(`ws-img-${id}`)) return;
    setGeneratingImage(true);
    setImageError(null);
    try {
      const fullPrompt = assembleImagePrompt(imageConcept as Parameters<typeof assembleImagePrompt>[0]);
      const res = await fetch("/api/comfyui/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, connectionId: toolId ?? undefined, width: 1024, height: 1024 }),
      });
      const data = await res.json() as { images?: Array<{ url: string }>; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Image generation failed");
      if (data.images?.length) setImage(data.images[0]);
      else throw new Error("No image returned");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
      releaseGenerationLock(`ws-img-${id}`);
    }
  };

  const generateVoice = async () => {
    if (generatingAudio || !voices.length) return;
    if (!acquireGenerationLock(`ws-vo-${id}`)) return;
    setGeneratingAudio(true);
    setAudioError(null);
    try {
      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: caption, voiceId: voiceId || voices[0].id }),
      });
      const data = await res.json() as { audio?: { url: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Voice generation failed");
      if (!data.audio) throw new Error("Voice engine returned no audio — try again");
      setAudio(data.audio);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Voice generation failed");
    } finally {
      setGeneratingAudio(false);
      releaseGenerationLock(`ws-vo-${id}`);
    }
  };

  const generateSound = async () => {
    if (generatingSfx) return;
    if (!acquireGenerationLock(`ws-sfx-${id}`)) return;
    setGeneratingSfx(true);
    setSfxError(null);
    try {
      const res = await fetch("/api/content-dashboard/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          imageConcept: Object.values(imageConcept).join(". "),
          brandName: item?.brandName,
          soundPrompt,
        }),
      });
      const data = await res.json() as { soundPrompt?: string; audio?: { url: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sound generation failed");
      if (!data.audio) throw new Error("Sound engine returned no audio — try again");
      setSfx({ soundPrompt: data.soundPrompt ?? soundPrompt, audio: data.audio });
    } catch (err) {
      setSfxError(err instanceof Error ? err.message : "Sound generation failed");
    } finally {
      setGeneratingSfx(false);
      releaseGenerationLock(`ws-sfx-${id}`);
    }
  };

  const reelBlockedReason = readOnly
    ? "Approved posts are not editable"
    : !reelSpec || !planAccepted
      ? "Generate and accept a reel plan first"
      : !audio
        ? "Generate voice-over first"
        : !sfx
          ? "Generate sound first"
          : anyGenerating
            ? "Another generation is running"
            : null;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="glass h-24 w-80 animate-pulse" />
          <div className="glass h-40 w-80 animate-pulse" />
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
            border: "1px solid rgba(99,102,241,0.35)",
            color: "var(--accent-bright)",
          }}
        >
          <IconImage size={26} />
        </div>
        <p className="text-lg font-semibold" style={{ color: "#fff" }}>Post not found.</p>
        <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          This post may have been deleted, or the link is stale. Your drafts and approved posts are still where you left them.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
          <Link href="/projects" className="btn-ghost">Your Brands</Link>
          <Link href="/approved" className="btn-ghost">Approved Posts</Link>
        </div>
      </main>
    );
  }

  const handle = item.brandName.toLowerCase().replace(/\s+/g, "");

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      {/* Back nav — the ONLY chrome on this page */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8">
        <BackPill href={item.brainId ? `/studio/${item.brainId}` : "/projects"} label="Back to Studio" />
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(120deg, var(--accent), #a855f7)" }}
          >
            {item.brandName}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{item.platform}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-2 lg:items-start">
        {/* LEFT: Instagram post */}
        <div className="mx-auto w-full" style={{ maxWidth: 420 }}>
          <div className="overflow-hidden rounded-2xl border-2 border-zinc-200 dark:border-zinc-700" style={{ background: "#fff" }}>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
                {item.brandName.charAt(0).toUpperCase()}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#262626" }}>{handle}</div>
            </div>

            {/* Image / Reel */}
            <div className="relative flex aspect-square items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              {reelMeta && (
                <div className="absolute left-3 top-3 z-20 flex gap-1.5">
                  {(["image", "reel"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={cardView === v}
                      onClick={() => setCardView(v)}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize backdrop-blur-sm transition ${
                        cardView === v ? "bg-white text-zinc-800" : "bg-black/50 text-white hover:bg-black/70"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              {cardView === "reel" && reelMeta ? (
                <video
                  controls
                  src={`/api/reel/file?item=${id}`}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ background: "#000" }}
                />
              ) : image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="relative z-10 flex w-full flex-col items-center gap-2 px-4 text-center">
                  <IconImage size={40} className="text-white/90" />
                  <div className="w-full space-y-0.5 text-left">
                    {Object.entries(imageConcept).map(([key, val]) => (
                      <div key={key} className="flex gap-1 text-[9px] leading-tight text-white/90">
                        <span className="font-semibold capitalize opacity-70">{key.replace(/([A-Z])/g, " $1")}:</span>
                        <span className="line-clamp-1">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-lg transition hover:bg-white disabled:opacity-70"
                disabled={readOnly || generatingImage || (anyGenerating && !generatingImage)}
                onClick={generateImage}
              >
                {generatingImage ? "Generating image..." : image ? "Regenerate Image" : "Generate Image"}
              </button>
              {imageError && <div className="absolute bottom-12 left-3 right-3 z-20 rounded-lg bg-red-500/90 px-3 py-1.5 text-[10px] text-white">{imageError}</div>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" className="ml-auto"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            <div className="px-3.5 pb-2">
              <p className="text-[13px] leading-[18px]" style={{ color: "#262626" }}>
                <span className="font-semibold">{handle}</span> {caption}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 px-3.5 pb-2">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-[12px]" style={{ color: "#00376b" }}>#{tag}</span>
              ))}
            </div>
            {cta && (
              <div className="px-3.5 pb-3">
                <div className="w-full rounded-lg py-2 text-center text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }}>
                  {cta}
                </div>
              </div>
            )}
            {(audio || sfx) && (
              <div className="border-t border-zinc-100 px-3.5 py-2 space-y-2">
                {audio && <audio controls src={audio.url} className="block w-full" preload="none" onPlay={(e) => exclusivePlay(e.currentTarget)} />}
                {sfx && <audio controls src={sfx.audio.url} className="block w-full" preload="none" onPlay={(e) => exclusivePlay(e.currentTarget)} />}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: tools + editing */}
        <div className="flex flex-col gap-4">
          <div className="glass p-4">
            <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>Media Tools</h3>

            {tools.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Image tool</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="chip cursor-pointer transition"
                      style={toolId === t.id ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : undefined}
                      onClick={() => setToolId(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reel */}
            <div className="mt-3">
              <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Reel length</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {([15, 30] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={reelDuration === d}
                    disabled={readOnly || planState === "planning"}
                    onClick={() => setReelDuration(d)}
                    className="chip cursor-pointer transition"
                    style={reelDuration === d ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : undefined}
                  >
                    {d}s
                  </button>
                ))}
                {reelSpec && reelSpec.durationSeconds !== reelDuration && (
                  <span className="text-[10px]" style={{ color: "var(--rose)" }}>
                    plan is {reelSpec.durationSeconds}s — regenerate
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="btn-primary w-full cursor-pointer !py-2 !text-xs"
                disabled={Boolean(reelBlockedReason)}
                title={reelBlockedReason ?? ""}
                onClick={generateReel}
              >
                <IconSpark size={13} />
                {reelMeta ? "Regenerate Reel" : "Generate Reel"}
              </button>
              {reelBlockedReason && (
                <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>{reelBlockedReason}</p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <select
                className="field-input flex-1 !py-1.5 !text-xs"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                aria-label="Select voice"
              >
                <option value="">Select voice</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.kind === "cloned" ? " (cloned)" : ""}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary cursor-pointer px-3 py-1.5 text-xs"
                disabled={readOnly || generatingAudio || !voices.length || (anyGenerating && !generatingAudio)}
                onClick={generateVoice}
              >
                {generatingAudio ? "..." : "Voice-over"}
              </button>
              {audio && (
                <button
                  type="button"
                  className="btn-ghost cursor-pointer px-2 py-1 text-xs"
                  onClick={() => { setAudio(null); generateVoice(); }}
                  disabled={generatingAudio}
                  aria-label="Regenerate voice"
                >
                  ↻
                </button>
              )}
            </div>
            {audioError && <p className="mt-1 text-[11px]" style={{ color: "var(--rose)" }}>{audioError}</p>}

            <div className="mt-2">
              <button
                type="button"
                className="btn-ghost w-full cursor-pointer"
                disabled={readOnly || generatingSfx || (anyGenerating && !generatingSfx)}
                onClick={generateSound}
              >
                {generatingSfx ? "Generating sound..." : "Generate Sound"}
              </button>
              {sfx?.soundPrompt && <p className="mt-1 text-[11px] italic" style={{ color: "var(--muted)" }}>{sfx.soundPrompt}</p>}
              {sfxError && <p className="mt-1 text-[11px]" style={{ color: "var(--rose)" }}>{sfxError}</p>}
            </div>
          </div>

          <div className="glass p-4">
            <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>Edit Post</h3>

            <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>
              Caption
              <textarea
                className="field-input !normal-case !tracking-normal"
                rows={5}
                value={caption}
                disabled={readOnly}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>

            <div className="mt-2">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>Hashtags</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {hashtags.map((tag, i) => (
                  <span key={i} className="chip">
                    #{tag}
                    <button
                      type="button"
                      className="ml-1 cursor-pointer opacity-60 hover:opacity-100"
                      disabled={readOnly}
                      onClick={() => setHashtags(hashtags.filter((_, j) => j !== i))}
                      aria-label={`Remove ${tag}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="field-input mt-1.5 !text-xs"
                value={newTag}
                disabled={readOnly}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = newTag.trim().replace(/^#/, "");
                    if (t && !hashtags.includes(t)) setHashtags([...hashtags, t]);
                    setNewTag("");
                  }
                }}
                placeholder="Add hashtag (Enter)"
              />
            </div>

            <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>
              Call to Action
              <input
                type="text"
                className="field-input !normal-case !tracking-normal"
                value={cta}
                disabled={readOnly}
                onChange={(e) => setCta(e.target.value)}
              />
            </label>

            <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>
              Sound Description
              <textarea
                className="field-input !normal-case !tracking-normal"
                rows={2}
                value={soundPrompt}
                disabled={readOnly}
                onChange={(e) => setSoundPrompt(e.target.value)}
              />
            </label>
          </div>

          {/* 15-sec Reel */}
          <div className="glass p-4">
            <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>15-sec Reel</h3>

            <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>
              Reel prompt
              <textarea
                className="field-input !normal-case !tracking-normal"
                rows={2}
                value={reelPrompt}
                disabled={readOnly || planState === "planning"}
                onChange={(e) => setReelPrompt(e.target.value)}
                placeholder="e.g. Punchy reel for young investors — hook with a bold claim, end with the CTA"
              />
            </label>

            {!readOnly && (
              <button
                type="button"
                className="btn-ghost mt-2 w-full cursor-pointer"
                disabled={planState === "planning" || anyGenerating}
                onClick={() => setShowImagePopup(true)}
              >
                {planState === "planning" ? "Planning…" : reelSpec ? "Regenerate Reel Plan" : "Generate Reel Plan"}
              </button>
            )}

            {hookScore !== null && planState === "planned" && (
              <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>Hook score: {hookScore}/10</p>
            )}

            {reelSpec && (
              <>
                <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-bright)" }}>
                  Script (editable)
                  <textarea
                    className="field-input !normal-case !tracking-normal"
                    rows={4}
                    value={specDraft}
                    disabled={readOnly}
                    onChange={(e) => { setSpecDraft(e.target.value); setPlanAccepted(false); }}
                  />
                </label>
                <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                  {specDraft.trim().split(/\s+/).filter(Boolean).length} words · {reelSpec.imageCount} image{reelSpec.imageCount > 1 ? "s" : ""} · {reelSpec.durationSeconds}s · captions auto-synced to the voice
                </p>
                {!readOnly && (
                  <button
                    type="button"
                    className="btn-primary mt-2 w-full cursor-pointer !py-2 !text-xs"
                    disabled={planAccepted}
                    onClick={usePlan}
                  >
                    {planAccepted ? "✓ Plan in use" : "Use Plan"}
                  </button>
                )}
              </>
            )}

            {reelError && <p className="mt-2 text-[11px]" style={{ color: "var(--rose)" }} role="alert">{reelError}</p>}
          </div>

          {!readOnly && (
            <div className="flex gap-3">
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={save}>
                <span role="status">
                  {saving ? "Saving..." : savedFlash ? "✓ Saved!" : "Save"}
                </span>
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                style={{ background: "linear-gradient(120deg, #10b981, #34d399)" }}
                disabled={saving}
                onClick={markApproved}
              >
                ✓ Mark as Approved
              </button>
            </div>
          )}
          {readOnly && (
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              ✓ Approved — this post is final and can no longer be edited.
            </p>
          )}
        </div>
      </div>

      {/* Image-count popup (asked before planning) */}
      {showImagePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(2,4,10,0.85)" }} role="dialog" aria-modal="true" aria-label="How many images">
          <div
            className="w-full p-6"
            style={{ maxWidth: "22rem", background: "#151a26", border: "1px solid var(--border-bright)", borderRadius: "1rem", boxShadow: "0 24px 80px -12px rgba(0,0,0,0.7)" }}
          >
            <h3 className="text-base font-semibold" style={{ color: "#fff" }}>How many images?</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Generated fresh for the reel — one visual per story beat. You can pick 1 to 3.
            </p>
            <div className="mt-4 flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={imageCountPick === n}
                  onClick={() => setImageCountPick(n)}
                  className="flex-1 cursor-pointer rounded-xl py-3 text-sm font-semibold transition"
                  style={
                    imageCountPick === n
                      ? { background: "#4f46e5", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "var(--muted)", border: "1px solid var(--border)" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setShowImagePopup(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => generatePlan(imageCountPick)}>
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation modal — freezes the app while the reel renders */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(2,4,10,0.85)" }} role="dialog" aria-modal="true" aria-label="Generating your reel">
          <div
            className="w-full p-8 text-center"
            style={{ maxWidth: "24rem", background: "#151a26", border: "1px solid var(--border-bright)", borderRadius: "1rem", boxShadow: "0 24px 80px -12px rgba(0,0,0,0.7)" }}
          >
            <svg className="mx-auto h-10 w-10 animate-spin" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" style={{ color: "var(--accent)" }} />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none" style={{ color: "var(--accent-bright)" }} />
            </svg>
            <h3 className="mt-4 text-base font-semibold" style={{ color: "#fff" }}>Generating your reel…</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }} role="status" aria-live="polite">
              {reelPhase}
            </p>
            <p className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>
              This can take a few minutes — please keep this tab open.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
