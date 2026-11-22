export interface ContentGoal {
  id: string;
  label: string;
  description: string;
  promptSuffix: string;
}

export const CONTENT_GOALS: ContentGoal[] = [
  {
    id: "launch",
    label: "Launch",
    description: "Announce a new product, feature, or collection with hype",
    promptSuffix: "Optimize for a product/collection LAUNCH. Build anticipation, create urgency, make the audience feel they must not miss out. Use launch energy: new, just dropped, first look, be the first.",
  },
  {
    id: "reach",
    label: "Reach",
    description: "Maximize visibility and brand awareness to new audiences",
    promptSuffix: "Optimize for MAXIMUM REACH and shareability. The content should be highly shareable, use broad appeal, trending formats, and relatable hooks that make people tag friends and share to stories.",
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "Drive comments, shares, saves, and conversations",
    promptSuffix: "Optimize for ENGAGEMENT. End with a compelling question or conversation starter, use interactive language, encourage comments and saves. Make people want to respond and share their opinion.",
  },
  {
    id: "sales",
    label: "Sales / Promo",
    description: "Drive conversions, purchases, and sign-ups",
    promptSuffix: "Optimize for SALES and CONVERSIONS. Highlight the offer, create urgency (limited time, exclusive), focus on benefits and ROI, include a strong direct CTA to buy/sign up now.",
  },
  {
    id: "education",
    label: "Education",
    description: "Teach, share tips, and deliver value to the audience",
    promptSuffix: "Optimize for EDUCATIONAL VALUE. Teach something useful, share tips, how-tos, or insights. Position the brand as an expert. The audience should save this post for later reference.",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    description: "Connect emotionally through brand stories and moments",
    promptSuffix: "Optimize for STORYTELLING and emotional connection. Tell a mini-story, share a behind-the-scenes moment, brand journey, or customer story. Make it human, authentic, and emotionally resonant.",
  },
  {
    id: "meme",
    label: "Meme / Humor",
    description: "Funny, relatable content built for shares",
    promptSuffix: "Optimize for HUMOR and relatability. Write meme-style, funny content that the audience sees themselves in. Use trending meme formats, witty wordplay, and humor that makes people tag friends and share.",
  },
  {
    id: "ugc",
    label: "UGC",
    description: "User-generated content and community repost style",
    promptSuffix: "Optimize for USER-GENERATED CONTENT feel. Write like a real customer or community member sharing their experience. Authentic, unpolished, first-person perspective. Celebrate the community.",
  },
  {
    id: "behind-scenes",
    label: "Behind the Scenes",
    description: "Raw, authentic team and process moments",
    promptSuffix: "Optimize for BEHIND-THE-SCENES authenticity. Show the real process, team moments, how things get made, the messy middle. Raw, unfiltered, human. Make the audience feel like insiders.",
  },
  {
    id: "before-after",
    label: "Before / After",
    description: "Transformation reveals and results showcases",
    promptSuffix: "Optimize for TRANSFORMATION impact. Create before/after narrative content that shows a dramatic change, results, or progress. Build curiosity gap, deliver satisfying reveal, make the change feel achievable.",
  },
  {
    id: "testimonial",
    label: "Testimonial",
    description: "Reviews, customer wins, and social proof",
    promptSuffix: "Optimize for SOCIAL PROOF and trust. Feature customer testimonials, reviews, results, or success stories. Make it specific and believable. Let happy customers do the selling.",
  },
  {
    id: "giveaway",
    label: "Giveaway",
    description: "Free prize posts with entry mechanics",
    promptSuffix: "Optimize for GIVEAWAY virality. Create excitement about a free prize. Clear entry mechanics (follow, like, tag, share), urgency (deadline), and prize desirability. Make people want to enter immediately.",
  },
  {
    id: "trend",
    label: "Trend / Challenge",
    description: "Trending formats and viral challenges",
    promptSuffix: "Optimize for TRENDJACKING. Use a trending format, audio vibe, meme, or challenge adapted to the brand. Feels current and in-the-know. Quick to consume, easy to replicate.",
  },
  {
    id: "collab",
    label: "Influencer Collab",
    description: "Creator partnerships and collab posts",
    promptSuffix: "Optimize for COLLABORATION authenticity. Write like an influencer/creator partnership — personal endorsement, genuine experience with the product, casual influencer voice. Balanced promo and authenticity.",
  },
  {
    id: "seasonal",
    label: "Seasonal",
    description: "Holiday, season, and timely event content",
    promptSuffix: "Optimize for SEASONAL relevance. Tie the content to the current/upcoming season, holiday, or cultural moment. Timely, festive, feels relevant RIGHT NOW. Seasonal hooks and vibes.",
  },
  {
    id: "carousel",
    label: "Carousel / Tips",
    description: "Swipeable multi-slide value posts",
    promptSuffix: "Optimize for CAROUSEL swipe-throughs. Structure as a multi-slide carousel: hook slide that stops the scroll, then 5-7 value slides (tips, steps, listicle), final CTA slide. Each slide gets slide number and content.",
  },
  {
    id: "poll",
    label: "Poll / This or That",
    description: "Interactive choice posts that force a vote",
    promptSuffix: "Optimize for INTERACTIVE engagement. Create a 'this or that', 'pick one', or choice-based post that forces the audience to vote in comments. Make both options tempting so people argue for their pick.",
  },
  {
    id: "quote",
    label: "Quote / Motivation",
    description: "Inspirational quote cards and motivation",
    promptSuffix: "Optimize for QUOTE CARD impact. Write a powerful, quotable motivational or inspirational line tied to the brand's values. Short, punchy, screenshot-worthy. The kind of quote people save and share to stories.",
  },
  {
    id: "announcement",
    label: "Announcement",
    description: "News, updates, and important changes",
    promptSuffix: "Optimize for ANNOUNCEMENT clarity and excitement. Deliver news, update, or change with energy. Lead with what's new/changed, why it matters to the audience, and what they should do next.",
  },
  {
    id: "hot-take",
    label: "Hot Take",
    description: "Bold opinions that spark debate in comments",
    promptSuffix: "Optimize for DEBATE and comment activity. Take a bold, slightly controversial but defensible opinion stance related to the industry/niche. Invite agreement AND disagreement. The comment section should light up.",
  },
  {
    id: "fill-blank",
    label: "Caption This",
    description: "Fill-in-the-blank and caption-this prompts",
    promptSuffix: "Optimize for EFFORTLESS replies. Create a 'caption this...', 'fill in the blank', or 'finish the sentence' post. The lowest possible effort for the audience to comment. Ultra-high comment rate format.",
  },
  {
    id: "myth-fact",
    label: "Myth vs Fact",
    description: "Myth-busting content — educational and shareable",
    promptSuffix: "Optimize for MYTH-BUSTING engagement. Structure as Myth vs Fact format. Bust a common misconception in the niche. Educational, shareable, makes people go 'I didn't know that!'. Save-worthy.",
  },
  {
    id: "countdown",
    label: "Countdown / Teaser",
    description: "Pre-launch teasers and anticipation builders",
    promptSuffix: "Optimize for ANTICIPATION and suspense. Tease something coming without revealing everything. Countdown energy, sneak peeks, 'you're not ready for this'. Build FOMO and make people turn on notifications.",
  },
  {
    id: "this-or-that",
    label: "Would You Rather",
    description: "Forced-choice debates that drive comments",
    promptSuffix: "Optimize for FORCED-CHOICE engagement. Create a 'would you rather', 'this or that', or dilemma post where BOTH options are appealing so the audience debates passionately in comments. Fun, light, highly debatable.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Describe exactly what you want — full creative control",
    promptSuffix: "",
  },
];
