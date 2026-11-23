/** Caption hygiene: no emojis, hashtags live in their own field. */

const EMOJI_GLOBAL = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
const EMOJI_TEST = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/u;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

export function hasEmoji(text: string): boolean {
  return EMOJI_TEST.test(text);
}

export function hasHashtag(text: string): boolean {
  return /#[\p{L}\p{N}_]/u.test(text);
}

export function stripEmoji(text: string): string {
  return text.replace(EMOJI_GLOBAL, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractHashtags(text: string): string[] {
  return [...text.matchAll(HASHTAG)].map((m) => m[1]);
}

export function stripHashtags(text: string): string {
  return text
    .replace(HASHTAG, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Caption line hygiene: plain English text only, tags moved out. */
export function cleanCaption(caption: string): { caption: string; tags: string[] } {
  return {
    caption: stripHashtags(stripEmoji(caption)),
    tags: extractHashtags(caption),
  };
}
