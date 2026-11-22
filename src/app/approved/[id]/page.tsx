import { Suspense } from "react";
import type { Metadata } from "next";
import ApprovedClient from "./approved-client";

export const metadata: Metadata = { title: "Approved Post" };

export default function ApprovedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-zinc-500">Loading...</div>
        </main>
      }
    >
      <ApprovedClient />
    </Suspense>
  );
}
