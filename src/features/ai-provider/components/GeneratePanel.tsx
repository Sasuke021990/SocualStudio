"use client";

import { useState, useEffect } from "react";

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
}

function readDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  if (payload === "[DONE]") return "";
  try {
    const parsed = JSON.parse(payload) as StreamChunk;
    return parsed.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export function GeneratePanel() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up on mount to ensure fresh state
  useEffect(() => {
    return () => {};
  }, []);

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;

    setStreaming(true);
    setError(null);
    setOutput("");
    const assistantMessages = [
      { role: "system", content: "You are a senior social media content strategist." },
      { role: "user", content: trimmed },
    ];
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: assistantMessages }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      }
      if (!res.body) throw new Error("Streaming response body is empty");

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
          const dataLines = event
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("data:"));
          for (const line of dataLines) {
            const delta = readDelta(line);
            if (delta === null) continue;
            if (delta === "") { done = true; break; }
            setOutput((prev) => prev + delta);
          }
          if (done) break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <section className="glass-card p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">AI Generation</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Generate social media content with your configured AI model.
      </p>
      <textarea
        className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        rows={6}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Write a prompt for your social media content... (try: 'Write an Instagram post about coffee with viral hooks')"
      />
      <button
        type="button"
        className="btn-primary mt-3 w-fit"
        disabled={streaming || !prompt.trim()}
        onClick={generate}
      >
        {streaming ? (
          <>
            <svg className="-my-0.5 mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
            Generating...
          </>
        ) : (
          "Generate with AI"
        )}
      </button>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {output && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800">
            <span>Output</span>
            <button
              type="button"
              onClick={() => setOutput("")}
              className="ml-auto rounded px-1.5 py-0.5 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
              aria-label="Clear output"
            >
              ✕
            </button>
          </div>
          <pre className="max-h-[480px] overflow-auto p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </section>
  );
}
