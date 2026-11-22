import { z } from "zod";

const stringRecord = z.record(z.string(), z.string());

export const mcpServerInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    transport: z.enum(["stdio", "http"]),
    command: z.string().trim().optional(),
    args: z.array(z.string()).optional(),
    env: stringRecord.optional(),
    url: z.string().trim().optional(),
    headers: stringRecord.optional(),
    enabled: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.transport === "stdio") {
      if (!val.command) {
        ctx.addIssue({ code: "custom", message: "Command is required for stdio servers", path: ["command"] });
      }
    } else if (!val.url) {
      ctx.addIssue({ code: "custom", message: "URL is required for HTTP servers", path: ["url"] });
    }
  });

export const mcpStagesSchema = z.object({
  brandExtraction: z.boolean(),
  research: z.boolean(),
  contentGeneration: z.boolean(),
});

export type McpServerInput = z.infer<typeof mcpServerInputSchema>;
