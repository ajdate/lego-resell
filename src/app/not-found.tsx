import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a]">
      <AppHeader />

      <main className="page-main mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-8 py-12">
          <p className="text-4xl">🧱</p>
          <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
          <p className="mt-3 text-zinc-400">
            Looks like this page has retired 😄
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-[#f59e0b] px-6 py-3 font-semibold text-zinc-900 transition hover:bg-[#fbbf24]"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
