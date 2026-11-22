import { Suspense } from "react";
import type { Metadata } from "next";
import BrandClient from "./brand-client";

export const metadata: Metadata = { title: "Brand" };

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
