import { Suspense } from "react";
import TargetsPageContent from "./TargetsPageContent";

export default function TargetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-col bg-[#0a0a0a] px-4 py-8">
          <p className="text-sm text-zinc-500">Loading targets…</p>
        </div>
      }
    >
      <TargetsPageContent />
    </Suspense>
  );
}
