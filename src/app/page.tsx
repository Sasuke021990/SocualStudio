import Link from "next/link";
import { LandingStats, LandingShowcase, LandingFaq, LandingFooter } from "./landing-sections";

export const metadata = {
  title: "Social Studio",
  description: "AI-powered social media content studio",
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  brand: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2a5 5 0 015 5c0 2.5-2 4-2 6h-6c0-2-2-3.5-2-6a5 5 0 015-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17h6M10 20h4" strokeLinecap="round" />
    </svg>
  ),
  image: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  voice: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" strokeLinecap="round" />
    </svg>
  ),
  sound: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" strokeLinecap="round" />
    </svg>
  ),
};

const STEPS_HERO = [
  {
    title: "Describe your brand",
    text: "Paste a URL or text — AI builds your complete brand profile.",
  },
  {
    title: "Generate content",
    text: "Pick a template and goal — get 5 on-brand posts with image, voice, and sound.",
  },
  {
    title: "Review & export",
    text: "Approve what you love, export a ready-to-publish workspace folder.",
  },
];

const FEATURES = [
  {
    icon: "brand",
    title: "Brand AI",
    text: "Paste a URL or text — AI extracts your full brand profile in seconds.",
  },
  {
    icon: "image",
    title: "Images",
    text: "ComfyUI-powered visuals matched to every caption and concept.",
  },
  {
    icon: "voice",
    title: "Voice",
    text: "Clone your voice or pick a preset — narrate every post.",
  },
  {
    icon: "sound",
    title: "Sound",
    text: "AI sound beds tuned to each post's mood and message.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient hero backdrop: layered glass panels + stronger mesh */}
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[720px]" />
      <div aria-hidden className="hero-mesh anim-ambient absolute inset-x-0 top-0 h-[720px]" />
      <div aria-hidden className="glass-hero anim-rise absolute left-[8%] top-[120px] h-[280px] w-[220px] rotate-[-8deg] opacity-60" />
      <div aria-hidden className="glass-hero anim-rise anim-rise-2 absolute right-[10%] top-[90px] h-[240px] w-[190px] rotate-[7deg] opacity-60" />
      <div aria-hidden className="glass-hero anim-rise anim-rise-3 absolute left-[18%] top-[320px] h-[160px] w-[140px] rotate-[4deg] opacity-35" />
      <div aria-hidden className="glass-hero anim-rise anim-rise-4 absolute right-[20%] top-[340px] h-[140px] w-[130px] rotate-[-5deg] opacity-35" />

      {/* Hero */}
      <header className="relative mx-auto flex max-w-4xl flex-col items-center px-8 pb-16 pt-36 text-center">
        <span className="chip anim-rise">
          <span className="anim-dot h-2 w-2 rounded-full" style={{ background: "var(--accent-bright)" }} />
          AI content studio
        </span>
        <h1
          className="anim-rise anim-rise-1 mt-6 text-[clamp(2.75rem,7vw,4.5rem)] font-bold leading-[1.02] tracking-tight"
          style={{ color: "#fff" }}
        >
          Social <span className="text-gradient">Studio</span>
        </h1>
        <p className="anim-rise anim-rise-2 mt-5 max-w-xl text-lg" style={{ color: "var(--muted)" }}>
          Create on-brand posts with local AI — captions, images, voice, and sound.
          From brand profile to ready-to-publish, in one studio.
        </p>

        <div className="anim-rise anim-rise-3 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/projects" className="btn-primary anim-glow !px-9 !py-4 !text-lg">
            Open Studio
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/dashboard" className="btn-ghost !px-9 !py-4 !text-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </Link>
        </div>
      </header>

      {/* Feature highlights */}
      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-5 px-8 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div key={f.title} className={`glass card-hover anim-rise anim-rise-${i + 1} p-6`}>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "var(--accent-bright)",
                boxShadow: "0 4px 18px -6px var(--accent-glow)",
              }}
            >
              {FEATURE_ICONS[f.icon]}
            </div>
            <h3 className="mt-4 text-base font-semibold" style={{ color: "#fff" }}>{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{f.text}</p>
          </div>
        ))}
      </section>

      <LandingStats />
      <LandingShowcase />

      {/* How it works */}
      <section className="relative mx-auto max-w-5xl px-8 pb-20">
        <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: "#fff" }}>
          From brand to post in minutes
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {STEPS_HERO.map((s, i) => (
            <div key={s.title} className="glass p-6">
              <div className="text-sm font-bold" style={{ color: "var(--accent-bright)" }}>0{i + 1}</div>
              <h3 className="mt-2 text-base font-semibold" style={{ color: "#fff" }}>{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <LandingFaq />
      <LandingFooter />
    </main>
  );
}
