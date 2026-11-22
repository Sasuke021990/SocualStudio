"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/features/content-dashboard/types";

export function StatCard({
  label,
  value,
  children,
  delay = 1,
}: {
  label: string;
  value: number;
  children?: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className={`glass anim-rise anim-rise-${delay} flex items-center gap-3 p-5`}>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
          border: "1px solid rgba(99,102,241,0.35)",
          color: "var(--accent-bright)",
          boxShadow: "0 4px 18px -6px var(--accent-glow)",
        }}
      >
        {children}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none" style={{ color: "#fff" }}>{value}</div>
        <div className="mt-1 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</div>
      </div>
    </div>
  );
}

export function MetaChips({ item, archived }: { item: ContentItem; archived?: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
        style={{ background: "linear-gradient(120deg, var(--accent), #a855f7)" }}
      >
        {item.brandName}{archived ? " · archived" : ""}
      </span>
      <span>{item.platform}</span>
      <span>·</span>
      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
    </div>
  );
}

export function DraftCard({
  item,
  onChanged,
  onDeleted,
}: {
  item: ContentItem;
  onChanged: (next: ContentItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.output);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>, apply: (next: ContentItem) => void) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/content-dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...body }),
      });
      const data = await res.json() as { item?: ContentItem; error?: string };
      if (!res.ok || !data.item) throw new Error(data.error ?? "Update failed");
      apply(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const approve = () => patch({ status: "approved" }, onChanged);

  const saveEdit = () =>
    patch({ title: title.trim() || item.title, output: caption }, (next) => {
      onChanged(next);
      setEditing(false);
    });

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/content-dashboard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      onDeleted(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div className="glass anim-rise p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-[rgba(99,102,241,0.35)] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-bright)]"
                  style={{ color: "#fff" }}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>Caption</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-[rgba(99,102,241,0.35)] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-bright)]"
                  style={{ color: "#fff" }}
                  rows={3}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="truncate text-sm font-semibold" style={{ color: "#fff" }}>{item.title}</div>
              <MetaChips item={item} />
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{item.output}</p>
            </>
          )}
          {error && <p className="mt-2 text-xs" style={{ color: "#f87171" }} role="alert">{error}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button type="button" className="btn-primary cursor-pointer px-4 py-2 text-xs transition-colors duration-200" disabled={busy} onClick={saveEdit}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button type="button" className="btn-ghost cursor-pointer px-4 py-2 text-xs transition-colors duration-200" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-primary cursor-pointer px-4 py-2 text-xs transition-colors duration-200" disabled={busy} onClick={approve}>
              Approve
            </button>
            <button type="button" className="btn-ghost cursor-pointer px-4 py-2 text-xs transition-colors duration-200" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn-ghost cursor-pointer px-4 py-2 text-xs transition-colors duration-200" style={{ color: "#f87171" }} disabled={busy} onClick={remove}>
              Delete
            </button>
            <Link href={`/workspace/${item.id}`} className="ml-auto text-xs transition-colors duration-200 hover:underline" style={{ color: "var(--accent-bright)" }}>
              Open in Workspace →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function ApprovedCard({ item, archived }: { item: ContentItem; archived?: boolean }) {
  return (
    <Link
      href={`/approved/${item.id}`}
      className="glass card-hover anim-rise flex items-center gap-4 p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold" style={{ color: "#fff" }}>{item.title}</div>
        <MetaChips item={item} archived={archived} />
      </div>
      <span className="shrink-0 text-xs font-semibold" style={{ color: "#34d399" }}>✓ Approved</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent-bright)" strokeWidth="1.8" aria-hidden>
        <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))",
          border: "1px solid rgba(99,102,241,0.35)",
          color: "var(--accent-bright)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "#fff" }}>{title}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>
      </div>
      {action}
    </div>
  );
}
