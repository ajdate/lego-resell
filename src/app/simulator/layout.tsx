import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Simulator",
};

export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
