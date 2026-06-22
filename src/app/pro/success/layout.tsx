import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Welcome to Pro",
};

export default function ProSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
