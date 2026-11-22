export const CONTENT_STATUSES = ["draft", "approved", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_TYPES = [
  "instagram-post",
  "instagram-reel",
  "instagram-story",
  "facebook-post",
  "facebook-reel",
  "facebook-story",
  "linkedin-post",
  "linkedin-article",
  "twitter-post",
  "youtube-short",
  "youtube-video",
  "tiktok-video",
  "email-campaign",
  "blog-post",
  "ad-copy",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export interface ContentItem {
  id: string;
  brandName: string;
  brainId: string;
  type: ContentType;
  title: string;
  prompt: string;
  output: string;
  status: ContentStatus;
  platform: string;
  variation?: {
    imageConcept: Record<string, string>;
    soundPrompt: string;
    caption: string;
    hashtags: string[];
    cta: string;
    generatedImage?: string | null;
    voiceAudio?: string | null;
    sfxAudio?: string | null;
    /** Approved reel plan (ReelSpec) — see features/reel. */
    reelSpec?: import("@/features/reel/schemas").ReelSpec;
    /** Rendered reel metadata — files live in the reel staging dir until post deletion. */
    reel?: { videoFile: string; imageFiles: string[]; createdAt: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContentTemplate {
  id: ContentType;
  label: string;
  platform: string;
  color: string;
  description: string;
  defaultPrompt: string;
  maxChars?: number;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "instagram-post",
    label: "Instagram Post",
    platform: "Instagram",
    color: "from-pink-500 to-purple-500",
    description: "Engaging feed post with caption, hashtags, and CTA",
    defaultPrompt: "Create an engaging Instagram feed post about {topic}. Include a compelling caption, relevant hashtags, and a clear call-to-action. Keep it visual-first and scroll-stopping.",
    maxChars: 2200,
  },
  {
    id: "instagram-reel",
    label: "Instagram Reel",
    platform: "Instagram",
    color: "from-purple-500 to-indigo-500",
    description: "Short-form video script with hooks and trending audio suggestions",
    defaultPrompt: "Write a script for a 30-second Instagram Reel about {topic}. Include a strong hook in the first 3 seconds, engaging body, and CTA. Suggest trending audio vibes and on-screen text overlays.",
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    platform: "Instagram",
    color: "from-amber-400 to-orange-500",
    description: "Quick story sequence with polls, questions, or countdowns",
    defaultPrompt: "Create a 3-frame Instagram Story sequence about {topic}. Include interactive elements (poll, question, or countdown). Keep each frame concise and visually descriptive.",
  },
  {
    id: "facebook-post",
    label: "Facebook Post",
    platform: "Facebook",
    color: "from-blue-500 to-blue-600",
    description: "Community-focused post optimized for shares and comments",
    defaultPrompt: "Write a Facebook post about {topic} that encourages comments and shares. Use a conversational tone, tell a mini-story, and end with a question or discussion prompt.",
  },
  {
    id: "facebook-reel",
    label: "Facebook Reel",
    platform: "Facebook",
    color: "from-blue-600 to-indigo-600",
    description: "Short video content optimized for Facebook's algorithm",
    defaultPrompt: "Write a script for a Facebook Reel about {topic}. Focus on storytelling and emotional connection. Include a hook, relatable content, and a share-worthy ending.",
  },
  {
    id: "facebook-story",
    label: "Facebook Story",
    platform: "Facebook",
    color: "from-indigo-500 to-blue-500",
    description: "Quick disappearing content for daily engagement",
    defaultPrompt: "Create a Facebook Story about {topic}. Keep it casual, authentic, and include a swipe-up or reply CTA. Make it feel personal and behind-the-scenes.",
  },
  {
    id: "linkedin-post",
    label: "LinkedIn Post",
    platform: "LinkedIn",
    color: "from-blue-600 to-sky-500",
    description: "Professional thought leadership post",
    defaultPrompt: "Write a LinkedIn post about {topic} that positions us as thought leaders. Use a professional but human tone, include a personal insight or data point, and end with a conversation starter.",
    maxChars: 3000,
  },
  {
    id: "linkedin-article",
    label: "LinkedIn Article",
    platform: "LinkedIn",
    color: "from-sky-500 to-blue-600",
    description: "Long-form professional article or newsletter",
    defaultPrompt: "Write a LinkedIn article about {topic}. Structure it with a compelling headline, introduction hook, 3-5 key insights with subheadings, and a conclusion with actionable takeaways.",
  },
  {
    id: "twitter-post",
    label: "X / Twitter Post",
    platform: "X / Twitter",
    color: "from-zinc-700 to-zinc-900",
    description: "Witty, concise tweet optimized for engagement",
    defaultPrompt: "Write a tweet about {topic} that's witty, concise, and engagement-worthy. Include a hook, a key insight, and encourage retweets. Stay within 280 characters.",
    maxChars: 280,
  },
  {
    id: "youtube-short",
    label: "YouTube Short",
    platform: "YouTube",
    color: "from-red-500 to-red-600",
    description: "Vertical short video script with strong hooks",
    defaultPrompt: "Write a script for a 60-second YouTube Short about {topic}. Start with a scroll-stopping hook, deliver value quickly, and end with a subscribe CTA. Include visual directions.",
  },
  {
    id: "youtube-video",
    label: "YouTube Video",
    platform: "YouTube",
    color: "from-red-600 to-rose-600",
    description: "Full video script with intro, chapters, and outro",
    defaultPrompt: "Write a YouTube video script about {topic}. Include: attention-grabbing intro, 3-5 main sections with timestamps, B-roll suggestions, engagement prompts (like/comment/subscribe), and a strong outro with CTA.",
  },
  {
    id: "tiktok-video",
    label: "TikTok Video",
    platform: "TikTok",
    color: "from-fuchsia-500 to-pink-500",
    description: "Trendy short video script with viral potential",
    defaultPrompt: "Write a TikTok video script about {topic} that has viral potential. Include a hook in the first 2 seconds, trending format/trend reference, authentic delivery style, and a share-worthy moment.",
  },
  {
    id: "email-campaign",
    label: "Email Campaign",
    platform: "Email",
    color: "from-emerald-500 to-teal-500",
    description: "Marketing email with subject line, body, and CTA",
    defaultPrompt: "Write a marketing email about {topic}. Include: 3 subject line options, preview text, engaging opening, key benefits (bullet points), social proof element, and a clear CTA button text.",
  },
  {
    id: "blog-post",
    label: "Blog Post",
    platform: "Website",
    color: "from-teal-500 to-cyan-500",
    description: "SEO-optimized blog article with structure",
    defaultPrompt: "Write an SEO-optimized blog post about {topic}. Include: compelling title, meta description, introduction with hook, H2/H3 subheadings, actionable content, key takeaways, and a CTA.",
  },
  {
    id: "ad-copy",
    label: "Ad Copy",
    platform: "Meta / Google",
    color: "from-violet-500 to-purple-600",
    description: "High-converting ad copy with multiple variations",
    defaultPrompt: "Write 3 variations of ad copy about {topic}. For each: attention-grabbing headline, primary text (short and punchy), description, and CTA button suggestion. Optimize for conversions.",
  },
];
