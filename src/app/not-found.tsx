import Link from "next/link";
import { PageChrome } from "@/components/nav";

export default function NotFound() {
  return (
    <main className="relative min-h-screen">
      <title>Page Not Found · Social Studio</title>
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome />

      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-8 pb-24 pt-24 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.25))",
            border: "1px solid rgba(99,102,241,0.35)",
            boxShadow: "0 8px 28px -8px var(--accent-glow)",
            color: "#fff",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5M8.5 11h5" />
          </svg>
        </div>
        <h1 className="anim-rise mt-6 text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>
          404 — Page not found
        </h1>
        <p className="anim-rise anim-rise-1 mt-3 max-w-md text-base leading-relaxed" style={{ color: "var(--muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Your brands and posts are untouched — pick a path below to keep going.
        </p>
        <div className="anim-rise anim-rise-2 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/projects" className="btn-ghost">
            Your Brands
          </Link>
          <Link href="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
