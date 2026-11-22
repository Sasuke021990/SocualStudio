import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Brands",
  description: "Select a brand to open its Studio, or create a new one.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
