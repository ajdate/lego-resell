import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Sets",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
