import type { ZodType } from "zod";

export type ProviderId = "lm-studio" | "ollama" | "openai" | "custom";

export interface ProviderConfig {
  providerId: ProviderId;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChatParams {
  config: ProviderConfig;
  messages: AIMessage[];
  signal?: AbortSignal;
}

export interface GenerateContentParams<T> {
  config: ProviderConfig;
  system: string;
  prompt: string;
  signal?: AbortSignal;
  maxRetries?: number;
  schema: ZodType<T>;
}

export interface AIProvider {
  readonly id: string;
  streamChat(params: StreamChatParams): AsyncGenerator<string>;
  generateContent<T>(params: GenerateContentParams<T>): Promise<T>;
}
