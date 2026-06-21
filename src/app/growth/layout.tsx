import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Growth History",
};

export default function GrowthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
