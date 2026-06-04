import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Battles",
};

export default function BattlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
