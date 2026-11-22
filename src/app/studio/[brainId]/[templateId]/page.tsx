import { Suspense } from "react";
import type { Metadata } from "next";
import TemplateClient from "./template-client";

export const metadata: Metadata = { title: "Create Content" };

export default function TemplatePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse" style={{ color: "var(--muted)" }}>Loading...</div>
        </main>
      }
    >
      <TemplateClient />
    </Suspense>
  );
}
