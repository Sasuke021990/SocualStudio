import OpenAI from "openai";
import { z, type ZodType } from "zod";
import type { Stream } from "openai/core/streaming";
import type { AIProvider, ProviderConfig, StreamChatParams, GenerateContentParams, AIMessage, Toolset } from "./types";

const DEFAULT_BASE_URLS: Record<string, string> = {
  "lm-studio": "http://127.0.0.1:1235/v1",
  ollama: "http://localhost:11434/v1",
  openai: "https://api.openai.com/v1",
};

const STREAM_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ResponseFormat = OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"];

const TOOL_MAX_ROUNDS = 5;
const TOOL_MAX_EXECUTIONS = 8;
const TOOL_CONTEXT_MAX_CHARS = 16_000;

function buildResponseFormats<T>(schema: ZodType<T>): ResponseFormat[] {
  const formats: ResponseFormat[] = [];
  try {
    const jsonSchema = z.toJSONSchema(schema);
    formats.push({
      type: "json_schema",
      json_schema: { name: "result", strict: true, schema: jsonSchema },
    } as ResponseFormat);
  } catch {
    // Schema not convertible to JSON Schema; skip to plain text.
  }
  formats.push({ type: "text" });
  return formats;
}

/** Parse model output that may be wrapped in code fences or prose. */
function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to fence/brace extraction.
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("AI provider returned non-JSON output.");
}

function isResponseFormatError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /response_format/i.test(message);
}

function defaultApiKey(): string {
  return process.env.OPENAI_API_KEY ?? "sk-no-authenticated-key";
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = "openai-compatible";

  constructor(private readonly config: ProviderConfig) {}

  private createClient(): OpenAI {
    const baseUrl =
      this.config.baseUrl ||
      DEFAULT_BASE_URLS[this.config.providerId] ||
      "https://api.openai.com/v1";
    return new OpenAI({
      baseURL: baseUrl,
      apiKey: this.config.apiKey ?? defaultApiKey(),
      // Local models load slowly and answer slowly — never cut them off early.
      timeout: 600_000,
      maxRetries: 1,
    });
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<string> {
    const { config, messages, signal, toolset } = params;
    const client = this.createClient();
    const finalMessages = toolset
      ? await this.appendToolContext(client, config, messages, toolset, signal)
      : messages;
    const stream = await this.createStream(client, config, finalMessages, signal);

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  /**
   * Bounded MCP tool rounds (D6): let the model call tools, feed results back,
   * and fold everything into the prompt so streaming/response_format stay
   * untouched (D8). Failures degrade to toolless generation (D7).
   */
  private async gatherToolContext(
    client: OpenAI,
    config: ProviderConfig,
    messages: AIMessage[],
    toolset: Toolset,
    signal?: AbortSignal,
  ): Promise<string> {
    const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(
      ({ role, content }) => ({ role, content }),
    );
    const lines: string[] = [];
    let executions = 0;

    for (let round = 0; round < TOOL_MAX_ROUNDS; round++) {
      if (signal?.aborted) break;
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await client.chat.completions.create({
          model: config.model,
          messages: history,
          tools: toolset.tools.map((t) => ({ type: "function", function: t.function })),
          ...(signal ? { signal } : {}),
        });
      } catch (error) {
        if (round === 0) {
          console.warn(
            "[mcp] tool round failed, continuing without tools:",
            error instanceof Error ? error.message : error,
          );
        }
        break;
      }

      const msg = completion.choices?.[0]?.message;
      const calls = (msg?.tool_calls ?? []).filter((c): c is Extract<typeof c, { type: "function" }> => "function" in c);
      if (calls.length === 0) break;

      history.push({
        role: "assistant",
        content: msg?.content ?? "",
        tool_calls: calls,
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam);

      for (const call of calls) {
        if (executions >= TOOL_MAX_EXECUTIONS) {
          history.push({ role: "tool", tool_call_id: call.id, content: "[tool error] tool budget exceeded" });
          continue;
        }
        executions += 1;
        let args: unknown = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          /* pass raw arguments string */
          args = call.function.arguments;
        }
        const result = await toolset.execute(call.function.name, args);
        history.push({ role: "tool", tool_call_id: call.id, content: result });
        if (lines.join("\n").length < TOOL_CONTEXT_MAX_CHARS) {
          lines.push(`- ${call.function.name}: ${result}`);
        }
      }
    }

    return lines.join("\n");
  }

  private async appendToolContext(
    client: OpenAI,
    config: ProviderConfig,
    messages: AIMessage[],
    toolset: Toolset,
    signal?: AbortSignal,
  ): Promise<AIMessage[]> {
    const context = await this.gatherToolContext(client, config, messages, toolset, signal);
    if (!context) return messages;
    const next = messages.map((m) => ({ ...m }));
    const lastUser = [...next].reverse().find((m) => m.role === "user");
    if (lastUser) {
      lastUser.content = `${lastUser.content}\n\n[Tool results]\n${context}`;
    }
    return next;
  }

  private async createStream(
    client: OpenAI,
    config: ProviderConfig,
    messages: StreamChatParams["messages"],
    signal?: AbortSignal,
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    for (let attempt = 0; ; attempt++) {
      try {
        const stream = await client.chat.completions.create({
          model: config.model,
          messages: messages.map(({ role, content }) => ({ role, content })),
          stream: true,
          ...(signal ? { signal } : {}),
        });
        return stream;
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        if (attempt >= STREAM_MAX_ATTEMPTS - 1) {
          throw error;
        }
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  async generateContent<T>(params: GenerateContentParams<T>): Promise<T> {
    const { config, system, prompt, schema, signal, maxRetries = 2, maxTokens = 4096, toolset } = params;
    let lastError: Error | undefined;

    // Optional MCP tool phase (D6/D7): gather tool results, fold into the prompt.
    let userPrompt = prompt;
    if (toolset) {
      const context = await this.gatherToolContext(
        this.createClient(),
        config,
        [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        toolset,
        signal,
      );
      if (context) {
        userPrompt = `${prompt}\n\n[Tool results]\n${context}`;
      }
    }

    // Structured-output support varies across OpenAI-compatible endpoints:
    // some accept `json_schema`, some only `text` (LM Studio rejects `json_object`).
    // Try `json_schema` first, fall back to plain `text` and parse the reply.
    const responseFormats = buildResponseFormats(schema);
    let formatIndex = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new Error("AI content generation aborted.");
      }

      try {
        const completion = await this.createClient().chat.completions.create({
          model: config.model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          response_format: responseFormats[formatIndex],
          ...(signal ? { signal } : {}),
        });

        const raw = completion.choices?.[0]?.message?.content;
        if (!raw) {
          throw new Error("AI provider returned an empty response.");
        }

        const parsed = schema.safeParse(parseJsonObject(raw));
        if (parsed.success) {
          return parsed.data;
        }

        lastError = new Error(
          `AI response failed schema validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Endpoint rejected our response_format: fall back to the next one
        // immediately instead of burning a retry on a known-incompatible call.
        if (isResponseFormatError(error) && formatIndex < responseFormats.length - 1) {
          formatIndex += 1;
          attempt -= 1;
          continue;
        }
      }

      if (attempt < maxRetries) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }

    throw lastError ?? new Error("AI content generation failed.");
  }
}
