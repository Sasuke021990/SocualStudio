"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { PageChrome } from "@/components/nav";
import { ProviderSettingsForm } from "@/features/ai-provider/components/ProviderSettingsForm";
import { WorkspaceSetup } from "@/features/workspace-config/components/WorkspaceSetup";
import { VoiceSetup } from "@/features/voice/components/VoiceSetup";
import { ComfyUISetup } from "@/features/comfyui/components/ComfyUISetup";

const TIPS = [
  "Local providers (LM Studio / Ollama) work with a blank or dummy API key — only OpenAI needs a real key.",
  "Models load automatically after saving a provider — pick any installed model from the dropdown.",
  "Voice cloning needs 5–30 seconds of clear speech. Presets work instantly without any upload.",
  "Export folder holds one subfolder per post: image, voice, sound, caption, README.",
];

export default function SettingsPage() {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="hero-mesh absolute inset-x-0 top-0 h-[380px]" />
      <div aria-hidden className="hero-grid absolute inset-x-0 top-0 h-[380px]" />
      <PageChrome back={{ href: "/projects", label: "Projects" }} />

      <section className="relative mx-auto max-w-3xl px-8 pb-24 pt-12">
        <h1 className="anim-rise text-4xl font-bold tracking-tight" style={{ color: "#fff" }}>Settings</h1>
        <p className="anim-rise anim-rise-1 mt-2" style={{ color: "var(--muted)" }}>
          Everything Social Studio needs to generate content: AI provider, workspace, voice, and image generation.
        </p>

        <Tabs defaultValue="provider" >
          <TabsList aria-label="Settings sections" className="mt-8 flex flex-wrap gap-2">
            <TabsTab value="provider">AI Provider</TabsTab>
            <TabsTab value="workspace">Workspace</TabsTab>
            <TabsTab value="voice">Voice Setup</TabsTab>
            <TabsTab value="comfyui">Image Generation</TabsTab>
          </TabsList>

          <TabsPanel value="provider">
            <div className="anim-rise mt-6"><ProviderSettingsForm /></div>
          </TabsPanel>
          <TabsPanel value="workspace">
            <div className="anim-rise mt-6"><WorkspaceSetup /></div>
          </TabsPanel>
          <TabsPanel value="voice">
            <div className="anim-rise mt-6"><VoiceSetup /></div>
          </TabsPanel>
          <TabsPanel value="comfyui">
            <div className="anim-rise mt-6"><ComfyUISetup /></div>
          </TabsPanel>
        </Tabs>

        {/* Quick tips */}
        <div className="glass anim-rise mt-10 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--accent-bright)" }}>
            Quick tips
          </h3>
          <ul className="mt-4 space-y-3">
            {TIPS.map((tip, i) => (
              <li key={tip} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
