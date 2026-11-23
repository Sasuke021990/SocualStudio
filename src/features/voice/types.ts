export interface VoiceProfile {
  id: string;
  name: string;
  kind: "preset" | "cloned";
  /** Ming voice-design instruction for presets, or reference file path for clones */
  instruct?: string;
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
    instruct: "A calm Indian woman with a warm, melodic Indian English accent. Smooth pacing, friendly, reassuring and trustworthy tone.",
    createdAt: "",
  },
  {
    id: "preset-energetic-host",
    name: "Kabir - Energetic Host",
    kind: "preset",
    instruct: "An enthusiastic young Indian male creator with bright energy and a modern urban Indian English accent. Upbeat pacing, punchy and dynamic delivery.",
    createdAt: "",
  },
  {
    id: "preset-professional",
    name: "Pooja - Professional",
    kind: "preset",
    instruct: "A confident Indian businesswoman with a polished, clear Indian English accent. Measured pacing, articulate, authoritative and clean.",
    createdAt: "",
  },
  {
    id: "preset-friendly",
    name: "Rohan - Casual Creator",
    kind: "preset",
    instruct: "A relaxed, conversational young Indian creator speaking natural, relatable Indian English. Friendly pacing, approachable and genuine.",
    createdAt: "",
  },
  {
    id: "preset-storyteller",
    name: "Vikram - Storyteller",
    kind: "preset",
    instruct: "A deep, resonant Indian male voice with dramatic pauses, rich timbre, emotional depth and captivating Indian cadence.",
    createdAt: "",
  },
];
