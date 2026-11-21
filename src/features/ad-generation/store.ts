import type { AdVariant } from "./types";

let variants: AdVariant[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function listAdVariants(): AdVariant[] {
  return variants.map((variant) => ({ ...variant }));
}

export function createAdVariant(input: {
  brandBrainId: string | null;
  platform: AdVariant["platform"];
  objective: string;
  format: string;
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  origin?: AdVariant["origin"];
}): AdVariant {
  const timestamp = now();
  const variant: AdVariant = {
    id: makeId(),
    brandBrainId: input.brandBrainId,
    platform: input.platform,
    objective: input.objective,
    format: input.format,
    angle: input.angle,
    primaryText: input.primaryText,
    headline: input.headline,
    description: input.description,
    cta: input.cta,
    charCounts: {
      primaryText: input.primaryText.length,
      headline: input.headline.length,
      description: input.description.length,
    },
    origin: input.origin ?? "wizard",
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  variants = [variant, ...variants];
  return { ...variant };
}

export function updateAdVariantStatus(id: string, status: AdVariant["status"]): AdVariant | null {
  const variant = variants.find((v) => v.id === id);
  if (!variant) {
    return null;
  }
  const updated: AdVariant = { ...variant, status, updatedAt: new Date().toISOString() };
  variants = variants.map((v) => (v.id === id ? updated : v));
  return { ...updated };
}
