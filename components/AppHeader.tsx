import Link from "next/link";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AppHeader({
  title = "BrickValue",
  subtitle = "LEGO resell assistant",
}: AppHeaderProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/60 px-6 py-5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b] text-lg font-bold text-zinc-900 transition hover:bg-[#fbbf24]"
          >
            B
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <nav className="hidden shrink-0 flex-wrap justify-end gap-1 text-sm md:flex sm:gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Search
          </Link>
          <Link
            href="/retiring-soon"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-[#f59e0b]"
          >
            Retiring Soon
          </Link>
          <Link
            href="/watchlist"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Watch List
          </Link>
          <Link
            href="/portfolio"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-[#f59e0b]"
          >
            Portfolio
          </Link>
          <Link
            href="/history"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            History
          </Link>
          <Link
            href="/growth"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-[#f59e0b]"
          >
            Growth
          </Link>
          <Link
            href="/opportunities"
            className="rounded-lg px-3 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Opportunities
          </Link>
        </nav>
      </div>
    </header>
  );
}
