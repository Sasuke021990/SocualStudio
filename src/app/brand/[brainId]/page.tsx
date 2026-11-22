import { Suspense } from "react";
import BrandClient from "./brand-client";

export default function BrandPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse" style={{ color: "var(--muted)" }}>Loading...</div>
        </main>
      }
    >
      <BrandClient />
    </Suspense>
  );
}
