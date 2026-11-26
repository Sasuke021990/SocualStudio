import { Suspense } from "react";
import type { Metadata } from "next";
import ApprovedClient from "./approved-client";

export const metadata: Metadata = { title: "Approved Post" };

export default function ApprovedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
          <div className="glass h-24 w-80 animate-pulse" />
          <div className="glass h-40 w-80 animate-pulse" />
        </main>
      }
    >
      <ApprovedClient />
    </Suspense>
  );
}
