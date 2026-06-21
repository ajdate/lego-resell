import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Retiring Soon",
};

export default function RetiringSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
