"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CONTENT_TEMPLATES, type ContentTemplate, type ContentItem, type ContentStatus } from "../types";
import { CONTENT_GOALS, type ContentGoal } from "../goals";
import type { PostVariation } from "../variations";
import { InstagramPostCard } from "./InstagramPostCard";

interface ComfyUIConnection {
  id: string;
  name: string;
  baseUrl: string;
  connected: boolean;
  workflowName: string | null;
}

interface Stats {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  published: number;
}

type View = "dashboard" | "creating";

export function ContentDashboard({ brandName, brainId }: { brandName: string; brainId: string }) {
  const [view, setView] = useState<View>("dashboard");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, inProgress: 0, approved: 0, published: 0 });
  const [activeTemplate, setActiveTemplate] = useState<ContentTemplate | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal | null>(null);
  const [customGoalText, setCustomGoalText] = useState("");
  const [topic, setTopic] = useState("");
  const [variations, setVariations] = useState<PostVariation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connections, setConnections] = useState<ComfyUIConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load ComfyUI connections for the image tool selector
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/comfyui")
        .then((res) => res.json())
        .then((data: { connections?: ComfyUIConnection[]; activeId?: string | null }) => {
          setConnections(data.connections ?? []);
          setActiveConnectionId(data.activeId ?? null);
          setSelectedToolId((prev) => prev ?? data.activeId ?? null);
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-dashboard?brainId=${encodeURIComponent(brainId)}`);
      const data = await res.json() as { items?: ContentItem[]; stats?: Stats };
      setItems(data.items ?? []);
      if (data.stats) setStats(data.stats);
    } catch { /* keep empty */ }
    setLoaded(true);
  }, [brainId]);

  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => loadDashboard(), 0);
      return () => clearTimeout(t);
    }
  }, [loaded, loadDashboard]);

  const generateBatch = async (isRegenerate = false) => {
    if (!activeTemplate || generating) return;
    if (selectedGoal?.id === "custom" && !customGoalText.trim()) return;
    if (!selectedGoal) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setError(null);
    if (!isRegenerate) {
      setVariations([]);
      setSelectedIds(new Set());
    }

    const goalPrompt = selectedGoal?.id === "custom"
      ? customGoalText.trim()
      : selectedGoal?.promptSuffix ?? "";

    try {
      const res = await fetch("/api/content-dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          brandName,
          topic: topic.trim(),
          platform: activeTemplate.platform,
          contentType: activeTemplate.label,
          count: 5,
          goalPrompt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("Empty response body");

      // Parse SSE stream — append each variation as it arrives
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) done = true;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          for (const line of event.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("data:"))) {
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(payload) as {
                phase?: string;
                variation?: PostVariation;
                warning?: string;
                error?: string;
              };
              if (parsed.phase) {
                setGenPhase(parsed.phase);
              }
              if (parsed.variation) {
                setVariations((prev) => [...prev, parsed.variation!]);
              }
              if (parsed.error) {
                setError(parsed.error);
              }
            } catch { /* ignore malformed line */ }
          }
          if (done) break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User-initiated stop — already-generated variations stay visible
        setGenPhase("Stopped by user");
      } else {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setGenerating(false);
      setGenPhase("");
      abortRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveSelected = async () => {
    if (selectedIds.size === 0 || saving || !activeTemplate) return;
    setSaving(true);
    setError(null);
    try {
      const toSave = variations.filter((v) => selectedIds.has(v.id));
      for (const v of toSave) {
        await fetch("/api/content-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName,
            brainId,
            type: activeTemplate.id,
            title: v.caption.slice(0, 80) || activeTemplate.label,
            prompt: activeTemplate.defaultPrompt.replace("{topic}", topic),
            output: `${v.caption}\n\n${v.hashtags.map((h) => `#${h}`).join(" ")}\n\nCTA: ${v.cta}\n\nImage concept: ${v.imageConcept}`,
            platform: activeTemplate.platform,
          }),
        });
      }
      setSaving(false);
      setView("dashboard");
      setActiveTemplate(null);
      setTopic("");
      setVariations([]);
      setSelectedIds(new Set());
      loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: ContentStatus) => {
    try {
      await fetch("/api/content-dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      loadDashboard();
    } catch { /* ignore */ }
  };

  // ─── CREATE VIEW ─────────────────────────────────────────────
  if (view === "creating" && activeTemplate) {
    return (
      <section className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${activeTemplate.color} text-2xl shadow-lg`}>
                {activeTemplate.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{activeTemplate.label}</h2>
                <p className="text-xs text-zinc-500">{activeTemplate.platform} · {brandName}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={() => { setView("dashboard"); setActiveTemplate(null); setTopic(""); setVariations([]); setSelectedIds(new Set()); setError(null); }}
            >
              ← Dashboard
            </button>
          </div>

          {/* Goal picker */}
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">What kind of post do you want?</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
              {CONTENT_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setSelectedGoal(goal)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition ${
                    selectedGoal?.id === goal.id
                      ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-500/20 dark:bg-violet-950/40"
                      : "border-zinc-200 bg-white/60 hover:border-violet-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-fuchsia-500"
                  }`}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <span className={`text-xs font-semibold ${selectedGoal?.id === goal.id ? "text-violet-700 dark:text-violet-300" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {goal.label}
                  </span>
                  <span className="text-[10px] leading-tight text-zinc-500">{goal.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom goal input */}
          {selectedGoal?.id === "custom" && (
            <div className="mt-3">
              <textarea
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                rows={3}
                value={customGoalText}
                onChange={(e) => setCustomGoalText(e.target.value)}
                placeholder="Describe exactly what you want... e.g., 'Funny meme-style post about Monday blues that relates to our streetwear audience, casual tone, use Gen-Z slang'"
              />
            </div>
          )}

          {/* Generate button + Stop + Image tool selector */}
          {selectedGoal && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={generating || (selectedGoal.id === "custom" && !customGoalText.trim())}
                  onClick={() => generateBatch()}
                >
                  {generating ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
                      Generating...
                    </>
                  ) : variations.length === 0 ? (
                    "✨ Create 5 Posts"
                  ) : (
                    "🔄 Generate 5 More"
                  )}
                </button>

                {/* Stop button */}
                {generating && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                    onClick={stopGeneration}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                      <rect x="2" y="2" width="10" height="10" rx="2" />
                    </svg>
                    Stop
                  </button>
                )}

                {/* Image tool radio selector */}
                {connections.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500">Image tool:</span>
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/60 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/60">
                      {connections.map((c) => (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            selectedToolId === c.id
                              ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <input
                            type="radio"
                            name="image-tool"
                            className="sr-only"
                            checked={selectedToolId === c.id}
                            onChange={() => setSelectedToolId(c.id)}
                          />
                          🎨 {c.name}
                          {c.id === activeConnectionId && " ●"}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {generating && genPhase && (
                <div className="mt-2 flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                  {genPhase}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {selectedGoal && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>{selectedGoal.icon}</span>
              <span>
                Goal: <span className="font-medium text-violet-600 dark:text-violet-400">{selectedGoal.label}</span>
                {selectedGoal.id === "custom" && customGoalText.trim() && (
                  <span> — &ldquo;{customGoalText.trim().slice(0, 60)}{customGoalText.trim().length > 60 ? "..." : ""}&rdquo;</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Generated variations grid */}
        {variations.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Generated Posts ({variations.length})
              </h3>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  className="btn-primary !py-2 !px-5 !text-sm"
                  disabled={saving}
                  onClick={saveSelected}
                >
                  {saving ? "Saving..." : `💾 Save ${selectedIds.size} Selected Post${selectedIds.size > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {variations.map((v) => (
                <InstagramPostCard
                  key={v.id}
                  variation={v}
                  selected={selectedIds.has(v.id)}
                  onToggleSelect={() => toggleSelect(v.id)}
                  brandName={brandName}
                  toolId={selectedToolId}
                />
              ))}
            </div>

            {/* Generate more */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="rounded-xl border-2 border-dashed border-zinc-300 px-8 py-4 text-sm font-medium text-zinc-600 transition hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-fuchsia-400"
                disabled={generating}
                onClick={() => generateBatch(true)}
              >
                {generating ? "Generating..." : "+ Generate 5 More Variations"}
              </button>
            </div>
          </div>
        )}

        {/* Empty state before first generation */}
        {variations.length === 0 && !generating && (
          <div className="glass-card flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950 dark:to-fuchsia-950">
              <span className="text-4xl">{activeTemplate.icon}</span>
            </div>
            <div>
              <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                Pick a goal above, then hit &ldquo;Create 5 Posts&rdquo;
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                AI will generate 5 unique {activeTemplate.label.toLowerCase()} variations with captions, hashtags, and image concepts &mdash; previewed exactly as they&apos;d look on {activeTemplate.platform}.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ─── DASHBOARD VIEW ──────────────────────────────────────────
  return (
    <section className="flex flex-col gap-6">
      {/* Header + stats */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Content Dashboard</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage content for <span className="font-medium text-violet-600 dark:text-violet-400">{brandName}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total" value={stats.total} icon="📊" color="from-zinc-500 to-zinc-600" />
          <StatCard label="Drafts" value={stats.draft} icon="📝" color="from-amber-400 to-orange-500" />
          <StatCard label="In Progress" value={stats.inProgress} icon="🔄" color="from-blue-400 to-blue-600" />
          <StatCard label="Approved" value={stats.approved} icon="✅" color="from-emerald-400 to-green-600" />
          <StatCard label="Published" value={stats.published} icon="🚀" color="from-violet-500 to-fuchsia-500" />
        </div>
      </div>

      {/* Template picker */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Create New Content</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a template to generate platform-optimized content for {brandName}.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CONTENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => { setActiveTemplate(tpl); setView("creating"); setVariations([]); setSelectedIds(new Set()); setError(null); }}
              className="group flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white/60 p-4 text-left transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-fuchsia-500"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tpl.color} text-xl shadow-md`}>
                {tpl.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tpl.label}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{tpl.platform}</div>
              </div>
              <div className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{tpl.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent content */}
      <div className="glass-card p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Content</h3>
        {items.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950 dark:to-fuchsia-950">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-500">
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No content yet. Pick a template above to get started.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const tpl = CONTENT_TEMPLATES.find((t) => t.id === item.type);
              return (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tpl?.color ?? "from-zinc-400 to-zinc-500"} text-xl shadow-md`}>
                    {tpl?.icon ?? "📄"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.platform} · {new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={item.status} />
                  <select
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value as ContentStatus)}
                    aria-label="Change status"
                  >
                    <option value="draft">Draft</option>
                    <option value="in-progress">In Progress</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-sm shadow-md`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</div>
          <div className="text-xs text-zinc-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const styles: Record<ContentStatus, string> = {
    "draft": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "published": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
