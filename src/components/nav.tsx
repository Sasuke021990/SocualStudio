"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BackPill({ href, label }: { href: string; label: string }) {
  // Deterministic in-app navigation: always go to the logical parent href so
  // the Back control can never exit the application (external history, etc.).
  return (
    <Link href={href} className="back-pill anim-rise">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

export function GearButton() {
  const pathname = usePathname();
  const current = pathname === "/settings";
  return (
    <Link
      href="/settings"
      className="gear-btn anim-rise"
      aria-label="Settings"
      aria-current={current ? "page" : undefined}
      style={current ? { color: "var(--accent-bright)", borderColor: "var(--accent)" } : undefined}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}

export function BrandChip({ name }: { name: string }) {
  return (
    <Link href="/projects" className="chip brand-chip anim-rise" title="Back to Your Brands">
      <span className="max-w-[10rem] truncate">{name}</span>
    </Link>
  );
}

export function PageChrome({
  back,
  brand,
}: {
  back?: { href: string; label: string };
  brand?: string;
}) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-8 sm:px-8">
      <div className="flex items-center gap-3">
        {back && <BackPill href={back.href} label={back.label} />}
      </div>
      <div className="flex items-center gap-3">
        {brand && <BrandChip name={brand} />}
        <GearButton />
      </div>
    </div>
  );
}
