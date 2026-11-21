import OpenAI from "openai";
import { z, type ZodType } from "zod";
import type { Stream } from "openai/core/streaming";
import type { AIProvider, ProviderConfig, StreamChatParams, GenerateContentParams } from "./types";

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
    });
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<string> {
    const { config, messages, signal } = params;
    const client = this.createClient();
    const stream = await this.createStream(client, config, messages, signal);

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
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
    const { config, system, prompt, schema, signal, maxRetries = 2 } = params;
    let lastError: Error | undefined;

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
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
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
