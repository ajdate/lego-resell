import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Price Targets",
};

export default function TargetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
