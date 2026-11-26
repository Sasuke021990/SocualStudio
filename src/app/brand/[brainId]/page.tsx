import { Suspense } from "react";
import type { Metadata } from "next";
import BrandClient from "./brand-client";

export const metadata: Metadata = { title: "Brand" };

export default function BrandPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-3">
          <div className="glass h-20 w-full max-w-md animate-pulse" />
          <div className="glass h-20 w-full max-w-md animate-pulse" />
        </main>
      }
    >
      <BrandClient />
    </Suspense>
  );
}
