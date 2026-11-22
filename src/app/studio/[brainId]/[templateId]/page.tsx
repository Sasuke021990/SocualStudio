import { Suspense } from "react";
import TemplateClient from "./template-client";

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
