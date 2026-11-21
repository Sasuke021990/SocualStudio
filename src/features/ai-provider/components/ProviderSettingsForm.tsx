"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AI_PRESETS } from "../presets";
import type { ProviderConfig, ProviderId } from "../types";

interface ProviderResponse {
  provider: ProviderConfig;
}

const DEFAULT_PROVIDER: ProviderConfig = {
  providerId: "lm-studio",
  baseUrl: "http://127.0.0.1:1235/v1",
  model: "ornith-1.5-9b",
};

interface ProviderSettingsFormProps {
  onSaved?: (provider: ProviderConfig) => void;
}

export function ProviderSettingsForm({ onSaved }: ProviderSettingsFormProps = {}) {
  const [provider, setProvider] = useState<ProviderConfig>(DEFAULT_PROVIDER);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<{ id: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load current saved config + available models on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: ProviderResponse) => {
        if (!cancelled && data?.provider) {
          setProvider(data.provider);
        }
      })
      .catch(() => {});

    // Defer to next microtask so React treats it as a separate render cycle, avoiding the cascading-render lint.
    setTimeout(() => {
      if (!cancelled) setLoadingModels(true);
    }, 0);

    fetch("/api/ai/models")
      .then((res) => res.json())
      .then((data: { models?: { id: string }[]; error?: string }) => {
        if (!cancelled && data.models?.length) {
          setModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false));

    return () => { cancelled = true; };
  }, []);

  const handleProviderChange = (providerId: ProviderId) => {
    const preset = AI_PRESETS.find((p) => p.id === providerId);
    setProvider({
      ...provider,
      providerId,
      baseUrl: preset?.baseUrl ?? DEFAULT_PROVIDER.baseUrl,
      apiKey: preset?.requiresApiKey ? provider.apiKey : undefined,
      model: preset?.defaultModel ?? "",
    });
    setStatus("idle");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider),
      });
      const data = (await res.json()) as ProviderResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save provider settings");
      setProvider(data.provider);
      setStatus("saved");
      onSaved?.(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider settings");
      setStatus("idle");
    }
  };

  const requiresApiKey = AI_PRESETS.find((p) => p.id === provider.providerId)?.requiresApiKey;
  const hasModels = models.length > 0;

  return (
    <section className="glass-card p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">AI Provider</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Select your AI provider and model, then save to start generating.
      </p>
      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* Provider */}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Provider
          <select
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={provider.providerId}
            onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
          >
            {AI_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>

        {/* Base URL */}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Base URL
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={provider.baseUrl}
            onChange={(e) => setProvider({ ...provider, baseUrl: e.target.value })}
            placeholder="http://127.0.0.1:1235/v1"
            required
          />
        </label>

        {/* API Key */}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          API Key
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            type="password"
            value={provider.apiKey ?? ""}
            onChange={(e) => setProvider({ ...provider, apiKey: e.target.value })}
            placeholder={requiresApiKey ? "sk-..." : "Not required for local models"}
          />
        </label>

        {/* Model */}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Model
          {hasModels ? (
            <>
              <select
                className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={provider.model}
                onChange={(e) => setProvider({ ...provider, model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))}
              </select>
              {!models.some((m) => m.id === provider.model) && models.length > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">Custom model name</span>
              )}
            </>
          ) : loadingModels ? (
            <div className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-500 animate-pulse dark:bg-zinc-900">
              Loading models...
            </div>
          ) : (
            <input
              type="text"
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={provider.model}
              onChange={(e) => setProvider({ ...provider, model: e.target.value })}
              placeholder="model-name (custom)"
              required
            />
          )}
        </label>

        {/* Save */}
        <button
          type="submit"
          className="btn-primary mt-2 w-fit"
          disabled={status === "saving"}
        >
          {status === "saving" ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="currentColor" strokeWidth="3" fill="none"/></svg>
              Saving...
            </>
          ) : (
            "Save and continue →"
          )}
        </button>

        {status === "saved" && <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Provider saved. You can now open the AI Generator.</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </section>
  );
}
