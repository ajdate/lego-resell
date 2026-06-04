import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Analysis",
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
