import type { Metadata } from "next";

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
