import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Brand",
  description: "Create a brand profile from a URL, pasted text, or an uploaded file.",
};

export default function NewBrandLayout({ children }: { children: React.ReactNode }) {
  return children;
}
