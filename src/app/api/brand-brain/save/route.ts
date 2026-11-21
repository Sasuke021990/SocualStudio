import { NextResponse } from "next/server";
import { z } from "zod";
import { saveBrandBrainFile } from "@/features/brand-brain/file-storage";

const saveSchema = z.object({
  brainId: z.string().min(1, "brainId is required"),
  brand: z.object({
    brandName: z.string().min(1, "brandName is required"),
    tagline: z.string().optional(),
    business: z.string(),
    industry: z.string(),
    usp: z.string(),
    tone: z.string(),
    brandVoice: z.string().optional(),
    visualStyle: z.string().optional(),
    audiencePains: z.array(z.string()),
    audienceDesires: z.array(z.string()),
    benefits: z.array(z.string()),
    keyMessages: z.array(z.string()).optional(),
    wordsToUse: z.array(z.string()),
    wordsToAvoid: z.array(z.string()),
    competitors: z.array(z.string()),
  }),
});

type BrandData = z.infer<typeof saveSchema>["brand"];

function buildMarkdown(data: BrandData): string {
  const lines: string[] = [];
  lines.push(`# ${data.brandName}`);
  if (data.tagline) lines.push(`*${data.tagline}*`);
  lines.push("");
  lines.push(`> Saved: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Business");
  lines.push(data.business);
  lines.push("");

  lines.push("## Industry");
  lines.push(data.industry);
  lines.push("");

  lines.push("## Unique Selling Proposition");
  lines.push(data.usp);
  lines.push("");

  lines.push("## Tone of Voice");
  lines.push(data.tone);
  if (data.brandVoice) {
    lines.push("");
    lines.push("**Brand Voice:** " + data.brandVoice);
  }
  lines.push("");

  if (data.visualStyle) {
    lines.push("## Visual Style");
    lines.push(data.visualStyle);
    lines.push("");
  }

  lines.push("## Target Audience");
  lines.push("");
  lines.push("### Pains");
  for (const p of data.audiencePains) lines.push(`- ${p}`);
  lines.push("");
  lines.push("### Desires");
  for (const d of data.audienceDesires) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## Benefits");
  for (const b of data.benefits) lines.push(`- ${b}`);
  lines.push("");

  if (data.keyMessages?.length) {
    lines.push("## Key Messages");
    for (const m of data.keyMessages) lines.push(`- ${m}`);
    lines.push("");
  }

  lines.push("## Words to Use");
  for (const w of data.wordsToUse) lines.push(`- ${w}`);
  lines.push("");

  lines.push("## Words to Avoid");
  for (const w of data.wordsToAvoid) lines.push(`- ${w}`);
  lines.push("");

  if (data.competitors.length) {
    lines.push("## Competitors");
    for (const c of data.competitors) lines.push(`- ${c}`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { brainId, brand } = parsed.data;
  const markdown = buildMarkdown(brand);
  const { path, fileName } = await saveBrandBrainFile(brainId, brand.brandName, markdown);

  return NextResponse.json({ file: { path, fileName }, markdown });
}
