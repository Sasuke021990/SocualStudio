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
    name: "Warm Narrator",
    kind: "preset",
    instruct: "A calm adult woman with a warm, clear voice. Smooth pacing, friendly and trustworthy tone.",
    createdAt: "",
  },
  {
    id: "preset-energetic-host",
    name: "Energetic Host",
    kind: "preset",
    instruct: "An enthusiastic young adult with bright energy. Upbeat pacing, dynamic and lively delivery.",
    createdAt: "",
  },
  {
    id: "preset-professional",
    name: "Professional",
    kind: "preset",
    instruct: "A confident adult with a polished, professional voice. Measured pacing, authoritative and clear.",
    createdAt: "",
  },
  {
    id: "preset-friendly",
    name: "Friendly Casual",
    kind: "preset",
    instruct: "A relaxed, conversational adult voice. Natural pacing, approachable and genuine.",
    createdAt: "",
  },
  {
    id: "preset-storyteller",
    name: "Storyteller",
    kind: "preset",
    instruct: "A deep, expressive storyteller voice. Rich tone with dramatic pauses and emotional range.",
    createdAt: "",
  },
];
