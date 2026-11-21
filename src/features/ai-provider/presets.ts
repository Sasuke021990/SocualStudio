import type { ProviderId } from "./types";

export interface AIPreset {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
}

export const AI_PRESETS: AIPreset[] = [
  {
    id: "lm-studio",
    label: "LM Studio (local)",
    baseUrl: "http://127.0.0.1:1235/v1",
    defaultModel: "ornith-1.5-9b",
    requiresApiKey: false,
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    requiresApiKey: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresApiKey: true,
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    defaultModel: "",
    requiresApiKey: false,
  },
];

export function presetFor(id: ProviderId): AIPreset {
  const preset = AI_PRESETS.find((p) => p.id === id);
  if (!preset) {
    throw new Error(`Unknown AI preset: ${id}`);
  }
  return preset;
}
