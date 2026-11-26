import { Suspense } from "react";
import type { Metadata } from "next";
import WorkspaceClient from "./workspace-client";

export const metadata: Metadata = { title: "Post Workspace" };

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
          <div className="glass h-24 w-80 animate-pulse" />
          <div className="glass h-40 w-80 animate-pulse" />
        </main>
      }
    >
      <WorkspaceClient />
    </Suspense>
  );
}
