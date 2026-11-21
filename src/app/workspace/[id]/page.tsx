import { Suspense } from "react";
import WorkspaceClient from "./workspace-client";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-zinc-500">Loading workspace...</div>
        </main>
      }
    >
      <WorkspaceClient />
    </Suspense>
  );
}
