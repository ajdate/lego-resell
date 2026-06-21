import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Portfolio Fit",
};

export default function PortfolioFitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
