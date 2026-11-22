import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approved Posts",
  description: "Every approved post, grouped by brand.",
};

export default function ApprovedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
