import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profit Calculator",
};

export default function ProfitCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
