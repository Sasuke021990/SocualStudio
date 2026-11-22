import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Every brand at a glance — approved posts and quick access.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
