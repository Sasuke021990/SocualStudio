import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodType } from "zod";
import { adPlatformSchema, adVariantContentSchema, resolveGenerationAngles } from "@/features/ad-generation/schemas";
import { createAdVariant } from "@/features/ad-generation/store";
import { buildAdVariantGenerationPrompt } from "@/features/ad-generation/prompts";
import { createCalendarItem } from "@/features/content-calendar/store";
import { createResearchItem, updateResearchItemAnalysis, addResearchBeatAdVariant, updateResearchItemStatus, getResearchItem } from "@/features/competitor-research/store";
import { researchAnalysisSchema } from "@/features/competitor-research/schemas";
import { buildResearchAnalysisPrompt } from "@/features/competitor-research/prompts";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { getBrandBrain } from "@/features/brand-brain/store";
import { calendarContentSchema, creativeScoreSchema, buildCalendarContentPrompt, buildCreativeScorePrompt } from "./prompts";

function toolSuccess(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

async function runGeneration<T>(schema: ZodType<T>, system: string, prompt: string): Promise<T> {
  const config = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);
  return provider.generateContent<T>({ config, system, prompt, schema });
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mysocialmediainfluencer",
    version: "0.1.0",
  });

  server.registerTool(
    "generate_ad_variant",
    {
      title: "Generate ad variant",
      description:
        "Generate one paid-social ad variant per creative angle (Meta or LinkedIn) using the configured AI provider. Returns the stored ad variants.",
      inputSchema: {
        platform: adPlatformSchema,
        objective: z.string().min(1).describe("Campaign objective, e.g. 'drive trial signups'"),
        format: z.string().min(1).describe("Ad format, e.g. 'static-image'"),
        angles: z
          .array(z.string().min(1))
          .min(1)
          .max(8)
          .describe("Creative angles; one ad variant is generated per angle"),
        brandBrainId: z.string().nullable().optional().describe("Optional brand ID for tone/context"),
      },
    },
    async ({ platform, objective, format, angles, brandBrainId }) => {
      try {
        const brandContent = brandBrainId ? (getBrandBrain(brandBrainId)?.content ?? null) : null;
        const adVariants = [];
        const failures: Array<{ angle: string; error: string }> = [];

        for (const angle of resolveGenerationAngles({ angles })) {
          const { system, prompt } = buildAdVariantGenerationPrompt({ platform, objective, format, angle, brandContent });
          try {
            const generated = await runGeneration(adVariantContentSchema, system, prompt);
            adVariants.push(
              createAdVariant({
                brandBrainId: brandBrainId ?? null,
                platform,
                objective,
                format,
                angle,
                primaryText: generated.primaryText,
                headline: generated.headline,
                description: generated.description ?? "",
                cta: generated.cta,
                origin: "ai",
              }),
            );
          } catch (error) {
            failures.push({ angle, error: error instanceof Error ? error.message : String(error) });
          }
        }

        if (adVariants.length === 0) {
          return toolError(`Generation failed for all angles: ${JSON.stringify(failures)}`);
        }
        return toolSuccess({ adVariants, failures });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "generate_content_calendar",
    {
      title: "Generate content calendar item",
      description:
        "AI-generate a social post for a topic and schedule it on the content calendar for one or more platforms.",
      inputSchema: {
        topic: z.string().min(1).describe("What the post should be about"),
        date: z.string().min(1).describe("Scheduled date (ISO, e.g. 2026-11-25)"),
        platforms: z.array(adPlatformSchema).min(1).describe("Target platforms"),
        brandBrainId: z.string().nullable().optional().describe("Optional brand ID for tone/context"),
      },
    },
    async ({ topic, date, platforms, brandBrainId }) => {
      try {
        const brandContent = brandBrainId ? (getBrandBrain(brandBrainId)?.content ?? null) : null;
        const platform = platforms[0];
        const { system, prompt } = buildCalendarContentPrompt({ platform, topic, date, brandContent });
        const generated = await runGeneration(calendarContentSchema, system, prompt);
        const item = createCalendarItem({
          brandBrainId: brandBrainId ?? "",
          date,
          platforms,
          content: generated.content,
        });
        return toolSuccess({ calendarItem: item });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "research_competitor",
    {
      title: "Research competitor ad",
      description:
        'Analyze a competitor ad ("Steal & Beat"): store the source ad, run AI analysis, and produce beat variants. Optionally create ad variants from beats in the same call.',
      inputSchema: {
        sourceAd: z.string().min(1).describe("The competitor ad copy or description"),
        sourceUrl: z.string().nullable().optional().describe("Optional source URL of the competitor ad"),
        platform: adPlatformSchema,
        createAdVariants: z
          .boolean()
          .optional()
          .describe("If true, create one ad variant per beat and mark the item approved"),
      },
    },
    async ({ sourceAd, sourceUrl, platform, createAdVariants }) => {
      try {
        const item = createResearchItem({ sourceAd, sourceUrl, platform });
        const { system, prompt } = buildResearchAnalysisPrompt({
          platform,
          sourceAd,
          sourceUrl: sourceUrl ?? undefined,
        });
        const analysis = await runGeneration(researchAnalysisSchema, system, prompt);
        let updated = updateResearchItemAnalysis(item.id, analysis);

        if (createAdVariants && updated) {
          updated.beatVariants.forEach((beat, index) => {
            const adVariant = createAdVariant({
              brandBrainId: null,
              platform,
              objective: "Competitive steal & beat",
              format: "single-image",
              angle: `beat-${index + 1}`,
              primaryText: beat.primaryText,
              headline: beat.headline,
              description: beat.description ?? "",
              cta: beat.cta,
              origin: "ai",
            });
            updated = addResearchBeatAdVariant(item.id, adVariant.id) ?? updated;
          });
          updated = updateResearchItemStatus(item.id, "approved") ?? updated;
        }

        return toolSuccess({ researchItem: updated ?? getResearchItem(item.id) });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "score_creative",
    {
      title: "Score ad creative",
      description:
        "Score ad copy on hook strength, clarity, CTA strength, and platform fit (0-100), with top strengths and improvements.",
      inputSchema: {
        platform: adPlatformSchema,
        objective: z.string().min(1).describe("Campaign objective"),
        primaryText: z.string().min(1),
        headline: z.string().optional(),
        description: z.string().optional(),
        cta: z.string().optional(),
      },
    },
    async ({ platform, objective, primaryText, headline, description, cta }) => {
      try {
        const { system, prompt } = buildCreativeScorePrompt({
          platform,
          objective,
          primaryText,
          headline,
          description,
          cta,
        });
        const score = await runGeneration(creativeScoreSchema, system, prompt);
        return toolSuccess({ score });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  );

  return server;
}
