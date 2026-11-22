import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "AI provider, workspace, voice, and image generation settings.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
