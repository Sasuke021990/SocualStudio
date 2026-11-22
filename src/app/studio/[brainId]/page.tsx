import { Suspense } from "react";
import type { Metadata } from "next";
import StudioClient from "./studio-client";

export const metadata: Metadata = { title: "Studio" };

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse" style={{ color: "var(--muted)" }}>Loading...</div>
        </main>
      }
    >
      <StudioClient />
    </Suspense>
  );
}
