import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price Monitor — BrickValue Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-100">{children}</div>
  );
}
