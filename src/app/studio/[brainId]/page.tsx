import { Suspense } from "react";
import StudioClient from "./studio-client";

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
