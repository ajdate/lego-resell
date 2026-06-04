import type { Metadata } from "next";

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
