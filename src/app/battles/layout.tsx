import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
