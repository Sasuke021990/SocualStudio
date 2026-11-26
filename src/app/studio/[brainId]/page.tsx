import { Suspense } from "react";
import type { Metadata } from "next";
import StudioClient from "./studio-client";

export const metadata: Metadata = { title: "Studio" };

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-3">
          <div className="glass h-20 w-full max-w-md animate-pulse" />
          <div className="glass h-20 w-full max-w-md animate-pulse" />
        </main>
      }
    >
      <StudioClient />
    </Suspense>
  );
}
