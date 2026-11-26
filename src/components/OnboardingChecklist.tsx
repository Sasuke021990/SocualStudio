"use client";

import { IconCheck } from "@/components/icons";

interface OnboardingStep {
  title: string;
  description: string;
  done: boolean;
}

function ChecklistRow({ title, description, done }: OnboardingStep) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={
          done
            ? {
                background: "rgba(52,211,153,0.15)",
                border: "1px solid rgba(52,211,153,0.4)",
                color: "var(--emerald)",
              }
            : {
                background: "transparent",
                border: "1px solid var(--border-bright)",
                color: "var(--muted)",
              }
        }
      >
        {done ? <IconCheck size={16} /> : null}
      </div>
      <div className="min-w-0 text-left">
        <div
          className="text-sm font-semibold"
          style={{ color: done ? "var(--muted)" : "#fff", textDecoration: done ? "line-through" : undefined }}
        >
          {title}
        </div>
        <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{description}</div>
      </div>
    </div>
  );
}

export function OnboardingChecklist({
  brandCount,
  postCount,
  approvedCount,
}: {
  brandCount: number;
  postCount: number;
  approvedCount: number;
}) {
  const steps: OnboardingStep[] = [
    {
      title: "Create a brand",
      description: "Set up a brand profile so content matches your voice.",
      done: brandCount > 0,
    },
    {
      title: "Generate your first post",
      description: "Pick a template in Studio and create a draft.",
      done: postCount > 0,
    },
    {
      title: "Approve a post",
      description: "Review a draft and mark it ready to publish.",
      done: approvedCount > 0,
    },
  ];

  if (steps.every((s) => s.done)) return null;

  return (
    <div className="glass anim-rise mx-auto mt-6 max-w-md">
      {steps.map((step, i) => (
        <div key={step.title} style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
          <ChecklistRow {...step} />
        </div>
      ))}
    </div>
  );
}
