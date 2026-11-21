import { Suspense } from "react";
import ApprovedClient from "./approved-client";

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
