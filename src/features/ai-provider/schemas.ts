import { z } from "zod";

export const providerIdSchema = z.enum(["lm-studio", "ollama", "openai", "custom"]);

export const providerConfigSchema = z.object({
  providerId: providerIdSchema,
  baseUrl: z.string().min(1, "baseUrl must be a non-empty string"),
  apiKey: z.string().optional(),
  model: z.string().min(1, "model must be a non-empty string"),
});

export const aiMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "content must be a non-empty string"),
});

export const aiGenerateRequestSchema = z.object({
  messages: z.array(aiMessageSchema).min(1, "messages must contain at least one message"),
});
