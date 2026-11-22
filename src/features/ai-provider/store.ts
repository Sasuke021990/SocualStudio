import { providerConfigSchema } from "./schemas";
import type { ProviderConfig } from "./types";

const DEFAULT_CONFIG: ProviderConfig = {
  providerId: "lm-studio",
  baseUrl: "http://127.0.0.1:1235/v1",
  model: "qwen3-coder-30b-a3b-instruct",
};

let currentConfig: ProviderConfig = { ...DEFAULT_CONFIG };

export function getProviderConfig(): ProviderConfig {
  return { ...currentConfig };
}

export function saveProviderConfig(input: unknown): ProviderConfig {
  const parsed = providerConfigSchema.parse(input);
  currentConfig = { ...parsed };
  return { ...currentConfig };
}
