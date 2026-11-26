"use client";

import React, { useRef, useState, useEffect } from "react";

interface ReelPlayerProps {
  src: string;
  brandName: string;
  handle: string;
  caption: string;
  hashtags?: string[];
  initialMuted?: boolean;
}

export function ReelPlayer({
  src,
  brandName,
  handle,
  caption,
  hashtags = [],
  initialMuted = false,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [progress, setProgress] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const [pulseIcon, setPulseIcon] = useState<"play" | "pause">("play");
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24800);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    videoRef.current?.load();
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        // Autoplay may be blocked by browser policy without user gesture
      });
      setPulseIcon("play");
    } else {
      video.pause();
      setPulseIcon("pause");
    }
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 500);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const formatCount = (num: number) => {
    return num >= 1000 ? `${(num / 1000).toFixed(1)}K` : `${num}`;
  };

  return (
    <div
      className="group relative h-full w-full cursor-pointer select-none overflow-hidden bg-black"
      onClick={togglePlay}
    >
      {/* Video Canvas */}
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted={isMuted}
        controls={false}
        className="h-full w-full object-cover"
      />

      {/* Tap-to-Play/Pause Pulse Indicator */}
      {showPulse && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="flex h-16 w-16 animate-ping items-center justify-center rounded-full bg-black/60 backdrop-blur-md">
            {pulseIcon === "play" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Floating Sound Toggle Pill (Top-Right) */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className="absolute right-3.5 top-9 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/75"
      >
        {isMuted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>

      {/* Right-Side Action Rail */}
      <div className="absolute bottom-16 right-2.5 z-20 flex flex-col items-center gap-3.5 text-white">
        {/* Like */}
        <button
          type="button"
          onClick={toggleLike}
          className="flex flex-col items-center gap-0.5 transition active:scale-125"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={liked ? "#ff2d55" : "none"}
              stroke={liked ? "#ff2d55" : "white"}
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold drop-shadow">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold drop-shadow">842</span>
        </div>

        {/* Share / Airplane */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold drop-shadow">1.9K</span>
        </div>

        {/* More */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </div>

        {/* Rotating Audio Vinyl Record */}
        <div
          className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-black shadow-lg ${
            isPlaying ? "animate-spin [animation-duration:4s]" : ""
          }`}
        >
          <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-black" />
          </div>
        </div>
      </div>

      {/* Bottom Profile & Caption Overlay */}
      <div className="absolute inset-x-0 bottom-3 z-20 px-3.5 pb-2 pt-8 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto">
        {/* Creator Info */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white bg-gradient-to-tr from-amber-500 to-fuchsia-600 ring-1 ring-white/50">
            {brandName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold drop-shadow">{handle}</span>
          <span className="text-white/60 text-xs">•</span>
          <button
            type="button"
            className="rounded border border-white/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition"
          >
            Follow
          </button>
        </div>

        {/* Caption Snippet with Expandable toggle */}
        <div
          className="cursor-pointer text-[11px] leading-tight text-white/95"
          onClick={(e) => {
            e.stopPropagation();
            setCaptionExpanded(!captionExpanded);
          }}
        >
          <p className={captionExpanded ? "" : "line-clamp-2"}>
            {caption}
          </p>
          {hashtags.length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-1 text-[10px] text-white/80 ${captionExpanded ? "" : "hidden"}`}>
              {hashtags.map((tag, idx) => (
                <span key={idx}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Audio Track Ticker */}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/90">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="truncate">Original Audio — {brandName}</span>
        </div>
      </div>

      {/* Micro Scrubber (2px Progress Bar at very bottom) */}
      <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/20">
        <div
          className="h-full bg-white transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

