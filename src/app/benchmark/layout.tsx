import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Benchmark Comparison",
};

export default function BenchmarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
