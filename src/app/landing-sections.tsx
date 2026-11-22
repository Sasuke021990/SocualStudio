"use client";

const STATS = [
  { value: "15", label: "Content templates" },
  { value: "25", label: "Goal types" },
  { value: "5+", label: "Voices incl. cloning" },
  { value: "100%", label: "Local & private" },
];

const SHOWCASE = [
  {
    step: "Caption",
    title: "Engagement-first copy",
    text: "Every post starts with a caption built for hooks, emotion, and action — matched to your brand voice.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 5h16M4 12h10M4 19h13" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    step: "Image",
    title: "8-point photo briefs",
    text: "Subject, setting, lighting, palette, style, composition, mood, technical — fed to your ComfyUI for precise visuals.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    step: "Audio",
    title: "Voice & sound, matched",
    text: "Your cloned voice narrates the caption. AI sound beds mirror the post's mood — all generated locally.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
        <path d="M15.5 8.5a5 5 0 010 7" strokeLinecap="round" />
        <rect x="18" y="9" width="3" height="6" rx="1.5" />
      </svg>
    ),
  },
];

export function LandingStats() {
  return (
    <section className="relative mx-auto max-w-5xl px-8 pb-20">
      <div className="glass grid grid-cols-2 gap-6 p-8 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold" style={{ color: "var(--accent-bright)" }}>{s.value}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingShowcase() {
  return (
    <section className="relative mx-auto max-w-5xl px-8 pb-20">
      <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: "#fff" }}>
        One prompt. Every format.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center" style={{ color: "var(--muted)" }}>
        The generation pipeline builds each post from three matched layers.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {SHOWCASE.map((s) => (
          <div key={s.step} className="glass card-hover p-6">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "var(--accent-bright)",
                boxShadow: "0 4px 18px -6px var(--accent-glow)",
              }}
            >
              {s.icon}
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
              {s.step}
            </div>
            <h3 className="mt-1.5 text-base font-semibold" style={{ color: "#fff" }}>{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-8 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "#fff" }}>Social Studio</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>— local AI content studio</span>
        </div>
        <div className="flex items-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
          <span>LM Studio · Ollama · ComfyUI</span>
          <span>Local & private</span>
        </div>
      </div>
    </footer>
  );
}
