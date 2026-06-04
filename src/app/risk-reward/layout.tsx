import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk vs Reward",
};

export default function RiskRewardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
