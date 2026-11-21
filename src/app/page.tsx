import { Suspense } from "react";
import { StudioContent } from "./studio-content";

export const metadata = {
  title: "MySocialMediaInfluencer",
  description: "AI-driven social media content generation and management",
};

export default function Home() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}
