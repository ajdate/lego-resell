import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "BrickValue pricing — free LEGO set analysis or Pro for portfolio tracking, AI listings, and investment tools.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
