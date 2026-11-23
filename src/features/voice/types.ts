export interface VoiceProfile {
  id: string;
  name: string;
  kind: "preset" | "cloned";
  /** User-facing description for UI display */
  description?: string;
  /** Ming voice-design instruction for presets, or reference file path for clones */
  instruct?: string;
  /** Pitch shift semitones for voice design */
  pitchShift?: number;
  referencePath?: string;
  referenceName?: string;
  createdAt: string;
}

export interface TTSConfig {
  modelPath: string;
  cliPath: string;
  backend: "vulkan" | "cpu";
  language: string;
}

export const VOICE_PRESETS: VoiceProfile[] = [
  {
    id: "preset-warm-narrator",
    name: "Aditi - Warm Narrator",
    kind: "preset",
    description: "A calm Indian woman with a warm, melodic voice. Trustworthy and friendly.",
    instruct: "\u5973\u6027\uFF0C\u6E29\u67D4\u5973\u58F0",
    pitchShift: 0,
    createdAt: "",
  },
  {
    id: "preset-energetic-host",
    name: "Kabir - Energetic Host",
    kind: "preset",
    description: "An enthusiastic young Indian male creator with bright energy and upbeat pacing.",
    instruct: "\u7537\u6027\uFF0C\u4F4E\u6C89\u7537\u58F0",
    pitchShift: -3,
    createdAt: "",
  },
  {
    id: "preset-professional",
    name: "Pooja - Professional",
    kind: "preset",
    description: "A confident Indian businesswoman with an articulate, polished corporate voice.",
    instruct: "\u5973\u6027\uFF0C\u77E5\u6027\u5E72\u7EC3\u5973\u58F0",
    pitchShift: 0,
    createdAt: "",
  },
  {
    id: "preset-friendly",
    name: "Rohan - Casual Creator",
    kind: "preset",
    description: "A relaxed, conversational young Indian creator speaking natural, relatable English.",
    instruct: "\u7537\u6027\uFF0C\u4F4E\u6C89\u7537\u58F0",
    pitchShift: -2,
    createdAt: "",
  },
  {
    id: "preset-storyteller",
    name: "Vikram - Storyteller",
    kind: "preset",
    description: "A deep, expressive Indian male voice with dramatic pauses and emotional depth.",
    instruct: "\u7537\u6027\uFF0C\u4F4E\u6C89\u7537\u58F0\uFF0C\u9752\u5E74\u7537\u5B50",
    pitchShift: -3,
    createdAt: "",
  },
];
