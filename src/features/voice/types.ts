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
    instruct: "女性，温柔女声，印度英语口音，Indian English accent, warm and melodic female narrator",
    pitchShift: 0,
    createdAt: "",
  },
  {
    id: "preset-energetic-host",
    name: "Kabir - Energetic Host",
    kind: "preset",
    description: "An enthusiastic young Indian male creator with bright energy and upbeat pacing.",
    instruct: "男性，青年男子，印度英语口音，Indian English accent, enthusiastic and upbeat male creator",
    pitchShift: -3,
    createdAt: "",
  },
  {
    id: "preset-professional",
    name: "Pooja - Professional",
    kind: "preset",
    description: "A confident Indian businesswoman with an articulate, polished corporate voice.",
    instruct: "女性，知性干练女声，印度英语口音，Indian English accent, articulate confident female voice",
    pitchShift: 0,
    createdAt: "",
  },
  {
    id: "preset-friendly",
    name: "Rohan - Casual Creator",
    kind: "preset",
    description: "A relaxed, conversational young Indian creator speaking natural, relatable English.",
    instruct: "男性，青年男子，印度英语口音，Indian English accent, casual conversational young Indian male",
    pitchShift: -2,
    createdAt: "",
  },
  {
    id: "preset-storyteller",
    name: "Vikram - Storyteller",
    kind: "preset",
    description: "A deep, expressive Indian male voice with dramatic pauses and emotional depth.",
    instruct: "男性，低沉男声，青年男子，印度英语口音，Indian English accent, deep expressive Indian male storyteller",
    pitchShift: -3,
    createdAt: "",
  },
];
