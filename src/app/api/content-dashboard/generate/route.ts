import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { imageConceptSchema } from "@/features/content-dashboard/variations";
import type { ProviderConfig } from "@/features/ai-provider/types";

const requestSchema = z.object({
  brandName: z.string().min(1),
  topic: z.string().default(""),
  platform: z.string().min(1),
  contentType: z.string().min(1),
  count: z.number().min(1).max(10).default(5),
  brandContext: z.string().optional(),
  goalPrompt: z.string().optional(),
});

const captionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
});

const captionWrapSchema = z.object({
  variation: captionSchema,
});

const imageFromCaptionSchema = z.object({
  imageConcept: imageConceptSchema,
  soundPrompt: z.string(),
});

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

  const { brandName, topic, platform, contentType, count, brandContext, goalPrompt } = parsed.data;
  const config: ProviderConfig = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const encoder = new TextEncoder();

  const captionSystemPrompt = `You are an expert ${platform} content copywriter for the brand "${brandName}".
${goalPrompt ? `GOAL: ${goalPrompt}\n` : ""}${brandContext ? `BRAND CONTEXT:\n${brandContext}\n` : ""}
Generate ONE ${contentType} variation${topic ? ` about "${topic}"` : ""} — caption only.

ENGAGEMENT RULES:
- Hook in the first line — stop the scroll
- Use metaphors, emotional angles, or relatable moments
- Conversational, human voice — not corporate
- Emojis where natural, never forced
- End with engagement bait: question, tag-a-friend, or bold statement

Schema:
{
  "variation": {
    "caption": string,      // Full post caption with line breaks
    "hashtags": string[],   // 5-10 hashtags WITHOUT the # symbol
    "cta": string           // Call to action button text
  }
}
Return ONLY valid JSON — no markdown fences, no prose.`;

  const imageSystemPrompt = `You are a professional photography director creating an image for a ${platform} post.
The image MUST visually depict the exact message, metaphor, and emotion of the caption below. Books, generic stock imagery, or unrelated objects are FORBIDDEN.

IMAGE RULES:
1. VISUAL-CAPTION MATCH: the image must tell the caption's story — same theme, same metaphor. If caption is about money planning, show money/planning visuals (coins organizing, charts, piggy banks with blueprints), NOT books or random objects.
2. HUMAN ELEMENT: include people/faces/hands when the caption is emotional or relatable — humans drive engagement.
3. SCROLL-STOPPING: bold contrast, curiosity gap, unexpected angle, or strong focal point. Designed for engagement.
4. SPELLING: if ANY text appears in the image (signs, screens, labels, product text), every word MUST be spelled correctly. Double-check each letter. Prefer minimal text.
5. 8-FIELD STRUCTURE: all 8 fields below must be specific and detailed like a photo shoot brief.

Schema:
{
  "imageConcept": {
    "subject": string,      // EXACT subject depicting the caption's message: who/what, pose, action, expression
    "setting": string,      // Environment, background, props that reinforce the caption theme
    "lighting": string,     // Light direction, quality, source, mood
    "colorPalette": string, // Specific colors reinforcing the caption's emotion
    "style": string,        // Photography/render type
    "composition": string,  // Camera angle, lens, framing, negative space for text
    "mood": string,         // Emotional atmosphere matching the caption
    "technical": string     // Quality tags + "correct spelling on any text elements"
  },
  "soundPrompt": string     // 20-30 word sound-effect description matched to the caption's mood: 2-3 layered concrete sounds (textures, rhythms, ambience). e.g. "soft cash register chime, gentle coin jingling, light paper shuffling with a warm ambient hum"
}
Return ONLY valid JSON — no markdown fences, no prose.`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        for (let i = 0; i < count; i++) {
          try {
            // PHASE 1: caption
            send({ phase: `Variation ${i + 1}/${count} — writing caption...` });
            const captionResult = await provider.generateContent<z.infer<typeof captionWrapSchema>>({
              config,
              system: captionSystemPrompt,
              prompt: `Generate variation ${i + 1} of ${count} for ${brandName}${topic ? ` about "${topic}"` : ""} on ${platform}. Make it DIFFERENT in angle/hook/tone.`,
              schema: captionWrapSchema,
              maxRetries: 3,
            });

            const cap = captionResult.variation;

            // PHASE 2: image concept FROM the caption
            send({ phase: `Variation ${i + 1}/${count} — designing image to match caption...` });
            const imageResult = await provider.generateContent<z.infer<typeof imageFromCaptionSchema>>({
              config,
              system: imageSystemPrompt,
              prompt: `Create the image for this exact post. The image must visually depict this caption's message and metaphor:\n\n---\n${cap.caption}\n---\n\nCTA: ${cap.cta}\nHashtags: ${cap.hashtags.join(", ")}`,
              schema: imageFromCaptionSchema,
              maxRetries: 3,
            });

            send({
              variation: {
                id: `var-${Date.now()}-${i}`,
                imageConcept: imageResult.imageConcept,
                soundPrompt: imageResult.soundPrompt,
                caption: cap.caption,
                hashtags: cap.hashtags,
                cta: cap.cta,
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
