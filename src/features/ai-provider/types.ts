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

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Structural match for `features/mcp-client` registry toolsets. */
export interface Toolset {
  tools: ToolSpec[];
  execute(name: string, args: unknown): Promise<string>;
}

export interface StreamChatParams {
  config: ProviderConfig;
  messages: AIMessage[];
  signal?: AbortSignal;
  toolset?: Toolset;
}

export interface GenerateContentParams<T> {
  config: ProviderConfig;
  system: string;
  prompt: string;
  signal?: AbortSignal;
  maxRetries?: number;
  /** Output token cap — generous default keeps JSON outputs from truncating. */
  maxTokens?: number;
  schema: ZodType<T>;
  toolset?: Toolset;
}

export interface AIProvider {
  readonly id: string;
  streamChat(params: StreamChatParams): AsyncGenerator<string>;
  generateContent<T>(params: GenerateContentParams<T>): Promise<T>;
}
