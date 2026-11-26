import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { acquireToolset } from "@/features/mcp-client/registry";
import { prepareForLlm } from "@/features/ai-provider/gpu";
import { freeComfyUIModels } from "@/features/comfyui/free";
import type { ProviderConfig } from "@/features/ai-provider/types";
import { INDIA_CONTEXT, INDIA_IMAGE_CONTEXT } from "@/features/prompts/india";
import { cleanCaption } from "@/features/prompts/clean";
import { loadBrandProfileJson } from "@/features/brand-brain/file-storage";
import { autoFreeVram } from "@/features/vram";

const requestSchema = z.object({
  brandName: z.string().min(1),
  brainId: z.string().optional(),
  topic: z.string().default(""),
  platform: z.string().min(1),
  contentType: z.string().min(1),
  count: z.number().min(1).max(10).default(5),
  brandContext: z.string().optional(),
  goalPrompt: z.string().optional(),
  /** Per-run override: true = use MCP tools even if the stage switch is off. */
  useMcp: z.boolean().optional(),
});

const flexibleImageConceptSchema = z.object({
  subject: z.string().default("Product presentation and visual narrative"),
  setting: z.string().default("Modern studio setting with clean aesthetic"),
  lighting: z.string().default("Soft ambient cinematic lighting"),
  colorPalette: z.string().default("Harmonious brand palette"),
  style: z.string().default("Commercial photography"),
  composition: z.string().default("Centered composition with negative space"),
  mood: z.string().default("Engaging and authentic"),
  technical: z.string().default("Sharp focus, high resolution, pure photography, no text, no watermark, no logo"),
});

const unifiedVariationSchema = z.object({
  caption: z.string().default(""),
  hashtags: z
    .array(z.union([z.string(), z.null(), z.undefined()]))
    .transform((tags) => tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0))
    .default([]),
  cta: z.string().default(""),
  imageConcept: flexibleImageConceptSchema,
  soundPrompt: z.string().default(""),
});

const unifiedWrapSchema = z.union([
  z.object({
    variation: unifiedVariationSchema,
  }),
  unifiedVariationSchema.transform((val) => ({
    variation: val,
  })),
]);

/**
 * Two-phase generation per variation, streamed over SSE:
 *   Phase 1: caption + hashtags + CTA (engagement-focused)
 *   Phase 2: 8-point imageConcept derived FROM the caption (visual-message match)
 * Events: {phase}, {variation}, [DONE], {error}.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { brandName, brainId, topic, platform, contentType, count, goalPrompt } = parsed.data;
  let brandContext = parsed.data.brandContext || "";

  if (brainId && !brandContext) {
    try {
      const profile = await loadBrandProfileJson(brainId);
      if (profile) {
        brandContext = [
          `Brand: ${profile.brandName} (${profile.tagline || profile.industry})`,
          `Business: ${profile.business}`,
          `USP: ${profile.usp}`,
          profile.demographics ? `Target Audience: ${profile.demographics.targetRoles.join(", ")} | ${profile.demographics.ageBracket} | ${profile.demographics.geography}` : "",
          profile.audiencePains?.length ? `Audience Pains: ${profile.audiencePains.join("; ")}` : "",
          profile.audienceDesires?.length ? `Audience Desires: ${profile.audienceDesires.join("; ")}` : "",
          profile.visualStyle ? `Visual Aesthetic: ${profile.visualStyle} | Lighting: ${profile.lightingStyle} | Palette: ${profile.colorPalette.primary}, ${profile.colorPalette.secondary}, ${profile.colorPalette.accent}` : "",
          profile.voicePersona ? `Tone & Voice: ${profile.voicePersona}` : "",
          profile.contentPillars?.length ? `Content Pillars: ${profile.contentPillars.join("; ")}` : "",
          profile.viralHookAngles?.length ? `Viral Hooks: ${profile.viralHookAngles.join("; ")}` : "",
          profile.wordsToUse?.length ? `Brand Vocabulary: ${profile.wordsToUse.join(", ")}` : "",
          profile.wordsToAvoid?.length ? `Words to Avoid: ${profile.wordsToAvoid.join(", ")}` : "",
          profile.primaryCta ? `Call to Action: ${profile.primaryCta}` : "",
        ].filter(Boolean).join("\n");
      }
    } catch {
      // Fallback
    }
  }

  const config: ProviderConfig = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const encoder = new TextEncoder();

  const unifiedVariationSystemPrompt = `You are an expert ${platform} content copywriter and photography director for the brand "${brandName}".
${goalPrompt ? `GOAL: ${goalPrompt}\n` : ""}${brandContext ? `BRAND CONTEXT:\n${brandContext}\n` : ""}
${INDIA_CONTEXT}

${INDIA_IMAGE_CONTEXT}

Generate ONE complete ${contentType} variation${topic ? ` about "${topic}"` : ""} in a single JSON object.

HOOK FORMULAS — open the caption with ONE of these, whichever fits the topic best:
1. Bold claim — a surprising fact, stat, or opinion stated flat, no hedging
2. Question — something the reader can't help answering in their head
3. Relatable pain — name a frustration the audience feels often, stated plainly
4. Mistake callout — "Stop doing X" naming a common wrong move
5. Number promise — "3 things that...", "in 10 seconds you'll..."
6. Contrarian — challenge common advice ("Most advice about X is wrong")
7. Story drop — open mid-scene, not at the beginning ("So there I was...")

CAPTION STRUCTURE:
- Line 1: the hook, standing alone, no setup.
- Middle: 1-3 short lines building the story, insight, or proof — one idea per line, no run-on paragraphs.
- Last line: an engaging question or a bold closing statement that invites a comment.
- Trade vague adjectives ("amazing", "best", "game-changing") for concrete, checkable specifics: a number, a named benefit, a before/after, a timeframe.
- Conversational human voice throughout — write like a person talking to one reader, not a brand broadcasting to a crowd.

HASHTAG STRATEGY:
- 5-8 tags: mix 1-2 broad/high-volume tags, 2-3 niche/industry tags, 1-2 brand or campaign-specific tags, and 1 community tag (e.g. indiancreators, indianstartup) where relevant.
- No generic filler tags (#love, #instagood, #follow4follow).

CTA GUIDANCE:
- A direct instruction, not a vague nudge: "Save this for later", "Tag someone who needs this", "DM us 'START'" beat "Check it out" or "Learn more" when the content supports something sharper.

VISUAL CONCEPT RULES:
- The image MUST visually depict the exact message, metaphor, and emotion of the caption — not a generic stock-photo mood.
- Pick whichever subject type sells the message hardest; vary it across variations instead of defaulting to a human portrait every time.
- ZERO TEXT IN IMAGE: NEVER include words, letters, captions, typography, signs, labels, screens with readable text, company names, logos, badges, or watermarks in any imageConcept field. Pure visual storytelling only.
- Every field should be specific and sensory — name the material, the light quality, the exact color, the lens/shot type — not a generic description a stock photo site would already have a thousand of.

IMAGE CONCEPT DIRECTIONS (pick whichever fits the caption best — see "Choosing the Subject" above for when each applies):
- Human focus: "subject": "Young Indian entrepreneur smiling warmly while holding a handcrafted ceramic cup"
- Product focus: "subject": "Single handcrafted ceramic cup catching morning light, steam rising in a soft curl, macro shot"
- Environment/mood focus: "subject": "Empty handcrafted ceramic cups arranged in a row on a sunlit windowsill, rangoli faintly visible below"

Return ONLY valid JSON matching this exact structure (replace example strings with your generated content; no markdown fences, no comments, no TypeScript types):
{
  "variation": {
    "caption": "Scroll-stopping hook on line 1.\\n\\nRelatable story or insight here.\\n\\nEngaging question at the end?",
    "hashtags": ["marketing", "brandstory", "growth", "creativity", "indiancreators"],
    "cta": "Learn More",
    "imageConcept": {
      "subject": "Young Indian entrepreneur smiling warmly while holding a handcrafted ceramic cup",
      "setting": "Sunlit modern studio desk with warm wooden textures and lush indoor plants",
      "lighting": "Golden hour side lighting casting soft natural shadows",
      "colorPalette": "Warm terracotta, cream, deep emerald green, soft gold highlights",
      "style": "Editorial lifestyle photography, candid natural moment",
      "composition": "Medium close-up shot on 50mm lens, shallow depth of field, rule of thirds",
      "mood": "Inspiring, authentic, warm and approachable",
      "technical": "Sharp focus on eyes, natural skin texture, rich dynamic range, pure photography, no text, no watermark, no logo"
    },
    "soundPrompt": "Warm acoustic guitar fingerpicking, gentle morning cafe ambience, soft ceramic clink"
  }
}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        for (let i = 0; i < count; i++) {
          try {
            send({ phase: `Variation ${i + 1}/${count} — writing & designing post...` });
            await prepareForLlm();
            const toolset =
              parsed.data.useMcp === false
                ? null
                : await acquireToolset("contentGeneration", { ignoreStage: parsed.data.useMcp === true });
            const result = await provider.generateContent<z.infer<typeof unifiedWrapSchema>>({
              config,
              system: unifiedVariationSystemPrompt,
              toolset: toolset ?? undefined,
              prompt: `Generate variation ${i + 1} of ${count} for ${brandName}${topic ? ` about "${topic}"` : ""} on ${platform}. Make it DIFFERENT in angle, hook, and visual scene from previous variations. Remember: ZERO text or logos in the imageConcept.`,
              schema: unifiedWrapSchema,
              maxRetries: 2,
            });

            const rawVar = result.variation;
            // Belt & braces: tags live only in hashtags[], text stays emoji-free.
            const cleaned = cleanCaption(rawVar.caption);
            const hashtags = [
              ...new Set([
                ...(rawVar.hashtags || [])
                  .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
                  .map((h) => h.replace(/^#/, "")),
                ...cleaned.tags,
              ]),
            ];

            send({
              variation: {
                id: `var-${Date.now()}-${i}`,
                imageConcept: rawVar.imageConcept,
                soundPrompt: rawVar.soundPrompt,
                caption: cleaned.caption,
                hashtags,
                cta: cleanCaption(rawVar.cta).caption,
                likes: Math.floor(Math.random() * 500) + 50,
                comments: Math.floor(Math.random() * 50) + 5,
              },
            });
          } catch (err) {
            send({ warning: `Variation ${i + 1} failed: ${err instanceof Error ? err.message : "unknown"}` });
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Generation failed" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await autoFreeVram({ target: "llm" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
