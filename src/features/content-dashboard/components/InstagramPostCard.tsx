"use client";

import { useState } from "react";
import type { PostVariation } from "../variations";
import { assembleImagePrompt } from "../variations";
import { exclusivePlay } from "@/features/voice/audio-coordinator";
import { acquireGenerationLock, releaseGenerationLock } from "../generation-lock";
import { useGenerationLocked } from "../useGenerationLock";
import { IconImage, IconMic, IconMusic, IconRefresh } from "@/components/icons";

interface InstagramPostCardProps {
  variation: PostVariation;
  selected: boolean;
  onToggleSelect: () => void;
  brandName: string;
  toolId?: string | null;
  voices?: Array<{ id: string; name: string; kind: string }>;
  onMediaChange?: (variationId: string, media: { image?: string | null; voiceAudio?: string | null; sfxAudio?: string | null }) => void;
}

interface GeneratedImage {
  url: string;
  filename: string;
}

interface GeneratedAudio {
  url: string;
}

interface GeneratedSfx {
  soundPrompt: string;
  audio: GeneratedAudio;
}

export function InstagramPostCard({ variation, selected, onToggleSelect, brandName, toolId, voices, onMediaChange }: InstagramPostCardProps) {
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [audio, setAudio] = useState<GeneratedAudio | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string>("");
  const [sfx, setSfx] = useState<GeneratedSfx | null>(null);
  const [generatingSfx, setGeneratingSfx] = useState(false);
  const [sfxError, setSfxError] = useState<string | null>(null);
  const anyGenerating = useGenerationLocked();

  const generateImage = async () => {
    if (generatingImage) return;
    if (!acquireGenerationLock(`img-${variation.id}`)) return;
    setGeneratingImage(true);
    setImageError(null);
    try {
      // Assemble the full 8-point prompt deterministically
      const fullPrompt = assembleImagePrompt(variation.imageConcept);
      const res = await fetch("/api/comfyui/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, connectionId: toolId ?? undefined }),
      });
      const data = (await res.json()) as { images?: GeneratedImage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Image generation failed");
      if (data.images?.length) {
        setImage(data.images[0]);
        onMediaChange?.(variation.id, { image: data.images[0].url });
      } else {
        throw new Error("No image returned");
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
      releaseGenerationLock(`img-${variation.id}`);
    }
  };

  const generateAudio = async () => {
    if (generatingAudio || !voices?.length) return;
    if (!acquireGenerationLock(`vo-${variation.id}`)) return;
    const selectedVoice = voiceId || voices[0].id;
    setGeneratingAudio(true);
    setAudioError(null);
    try {
      const res = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: variation.caption,
          voiceId: selectedVoice,
        }),
      });
      const data = (await res.json()) as { audio?: GeneratedAudio; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Voice generation failed");
      if (data.audio) {
        setAudio(data.audio);
        onMediaChange?.(variation.id, { voiceAudio: data.audio.url });
      } else {
        throw new Error("No audio returned");
      }
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Voice generation failed");
    } finally {
      setGeneratingAudio(false);
      releaseGenerationLock(`vo-${variation.id}`);
    }
  };

  const generateSfx = async () => {
    if (generatingSfx) return;
    if (!acquireGenerationLock(`sfx-${variation.id}`)) return;
    setGeneratingSfx(true);
    setSfxError(null);
    try {
      const imageConceptText = Object.values(variation.imageConcept).join(". ");
      const res = await fetch("/api/content-dashboard/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: variation.caption,
          imageConcept: imageConceptText,
          brandName,
          soundPrompt: variation.soundPrompt,
        }),
      });
      const data = (await res.json()) as GeneratedSfx & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sound generation failed");
      setSfx(data);
      onMediaChange?.(variation.id, { sfxAudio: data.audio.url });
    } catch (err) {
      setSfxError(err instanceof Error ? err.message : "Sound generation failed");
    } finally {
      setGeneratingSfx(false);
      releaseGenerationLock(`sfx-${variation.id}`);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 transition-all ${
        selected
          ? "border-violet-500 shadow-lg shadow-violet-500/20"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
      style={{ background: "#fff", maxWidth: 400, width: "100%" }}
    >
      {/* Header — profile row */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
        >
          {brandName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold" style={{ color: "#262626" }}>
            {brandName.toLowerCase().replace(/\s+/g, "")}
          </div>
        </div>
        <button type="button" className="text-zinc-400 hover:text-zinc-600" aria-label="More options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
        </button>
      </div>

      {/* Image area */}
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={variation.imageConcept.subject.slice(0, 100)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }} />
            <div className="relative z-10 flex w-full flex-col items-center gap-2 px-4 text-center">
              <IconImage size={40} className="text-white/90" />
              <div className="w-full space-y-0.5 text-left">
                {(Object.entries(variation.imageConcept) as Array<[string, string]>).map(([key, val]) => (
                  <div key={key} className="flex gap-1 text-[9px] leading-tight text-white/90">
                    <span className="font-semibold capitalize opacity-70">{key.replace(/([A-Z])/g, " $1")}:</span>
                    <span className="line-clamp-1">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Generate image button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); generateImage(); }}
              disabled={generatingImage || (anyGenerating && !generatingImage)}
              className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-lg transition hover:bg-white disabled:opacity-70"
            >
              {generatingImage ? (
                <>
                  <svg className="mr-1.5 inline h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                  Generating image...
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <IconImage size={13} />
                  Generate Image
                </span>
              )}
            </button>
          </>
        )}
        {/* Image concept label */}
        {!image && (
          <div className="absolute right-3 top-3 rounded-full bg-black/20 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
            Image concept
          </div>
        )}
        {/* Regenerate button on generated image */}
        {image && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setImage(null); generateImage(); }}
            disabled={generatingImage}
            className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            {generatingImage ? (
              "..."
            ) : (
              <span className="inline-flex items-center gap-1">
                <IconRefresh size={11} />
                Regenerate
              </span>
            )}
          </button>
        )}
        {imageError && (
          <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-red-500/90 px-3 py-1.5 text-[10px] text-white">
            {imageError}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button type="button" className="transition hover:scale-110" aria-label="Like">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button type="button" className="transition hover:scale-110" aria-label="Comment">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button type="button" className="transition hover:scale-110" aria-label="Share">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          className="ml-auto transition hover:scale-110"
          aria-label="Save"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        >
          {selected ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth="1.8">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Likes */}
      <div className="px-3.5 pb-1">
        <p className="text-[13px] font-semibold" style={{ color: "#262626" }}>
          {variation.likes.toLocaleString()} likes
        </p>
      </div>

      {/* Caption */}
      <div className="px-3.5 pb-2">
        <p className="text-[13px] leading-[18px]" style={{ color: "#262626" }}>
          <span className="font-semibold">{brandName.toLowerCase().replace(/\s+/g, "")}</span>{" "}
          {variation.caption}
        </p>
      </div>

      {/* Hashtags */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 px-3.5 pb-2">
        {variation.hashtags.map((tag, i) => (
          <span key={i} className="text-[12px]" style={{ color: "#00376b" }}>
            #{tag.replace(/^#/, "")}
          </span>
        ))}
      </div>

      {/* CTA */}
      {variation.cta && (
        <div className="px-3.5 pb-3">
          <button
            type="button"
            className="w-full rounded-lg py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }}
          >
            {variation.cta}
          </button>
        </div>
      )}

      {/* Comments preview */}
      <div className="border-t border-zinc-100 px-3.5 py-2">
        <p className="text-[12px] text-zinc-400">View all {variation.comments} comments</p>
      </div>

      {/* Voice-over + sound section */}
      {voices && voices.length > 0 && (
        <div className="border-t border-zinc-100 px-3.5 py-2.5">
          {/* Voice-over */}
          {audio ? (
            <div className="flex items-center gap-2">
              <audio
                controls
                src={audio.url}
                className="block min-w-0 flex-1"
                preload="none"
                onPlay={(e) => exclusivePlay(e.currentTarget)}
              />
              <button
                type="button"
                className="rounded-full border border-zinc-200 px-2.5 py-1 text-[10px] text-zinc-500 transition hover:bg-zinc-100"
                onClick={() => { setAudio(null); generateAudio(); }}
                disabled={generatingAudio || (anyGenerating && !generatingAudio)}
                aria-label="Regenerate voice"
              >
                <IconRefresh size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-800"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                aria-label="Select voice"
              >
                <option value="">Select voice</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.kind === "cloned" ? `${v.name} · cloned` : v.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={generatingAudio || (anyGenerating && !generatingAudio)}
                onClick={generateAudio}
              >
                {generatingAudio ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                    ...
                  </>
                ) : (
                  <>
                    <IconMic size={13} />
                    Voice-over
                  </>
                )}
              </button>
            </div>
          )}
          {audioError && <p className="mt-1 text-[10px] text-red-500">{audioError}</p>}

          {/* Sound effects */}
          <div className="mt-2">
            {sfx ? (
              <div className="flex items-center gap-2">
                <audio
                  controls
                  src={sfx.audio.url}
                  className="block min-w-0 flex-1"
                  preload="none"
                  onPlay={(e) => exclusivePlay(e.currentTarget)}
                />
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-[10px] text-zinc-500 transition hover:bg-zinc-100"
                  onClick={() => { setSfx(null); generateSfx(); }}
                  disabled={generatingSfx || (anyGenerating && !generatingSfx)}
                  aria-label="Regenerate sound"
                >
                  <IconRefresh size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:border-purple-300 hover:text-purple-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                disabled={generatingSfx || (anyGenerating && !generatingSfx)}
                onClick={generateSfx}
              >
                {generatingSfx ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                    Generating sound...
                  </>
                ) : (
                  <>
                    <IconMusic size={13} />
                    Generate Sound
                  </>
                )}
              </button>
            )}
            {sfx?.soundPrompt && (
              <p className="mt-1 text-[9px] italic text-zinc-400">{sfx.soundPrompt}</p>
            )}
            {sfxError && <p className="mt-1 text-[10px] text-red-500">{sfxError}</p>}
          </div>
        </div>
      )}

      {/* Select overlay */}
      <button
        type="button"
        onClick={onToggleSelect}
        className={`block w-full py-2.5 text-[13px] font-semibold transition ${
          selected
            ? "bg-violet-500 text-white hover:bg-violet-600"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }`}
      >
        {selected ? "✓ Selected — will be saved" : "Select this post"}
      </button>
    </div>
  );
}
