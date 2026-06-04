"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SetSearchInput,
  type SetSearchInputHandle,
} from "@/components/SetSearchInput";
import { PersonalizedHomeCard } from "@/components/PersonalizedHomeCard";
import type { Condition } from "@/lib/analyze";
import { getAllMarketOpportunities } from "@/lib/market-opportunities";
import { isOnboardingComplete } from "@/lib/onboarding";
import { SetImage } from "@/components/SetImage";
import { buySignalClassName } from "@/lib/opportunityScoring";
import {
  getAllRetiringSoonEntries,
  RETIRING_TIER_CONFIG,
} from "@/lib/retiring-soon";
import { BROWSE_CATEGORIES } from "@/lib/search";
import { WaitlistSection } from "@/components/WaitlistSection";
import { openWaitlistInNewTab } from "@/lib/waitlist";

interface SetOption {
  number: string;
  name: string;
  retired?: boolean;
  retiringSoon?: boolean;
}

const CONDITIONS: { value: Condition; label: string; hint: string }[] = [
  { value: "sealed", label: "Sealed", hint: "Factory sealed box" },
  { value: "complete", label: "Complete", hint: "Built, all parts & instructions" },
  { value: "incomplete", label: "Incomplete", hint: "Missing pieces or box" },
];

const EXAMPLE_SETS = [
  { number: "10262", label: "DB5" },
  { number: "75192", label: "Falcon" },
  { number: "21348", label: "Red London" },
] as const;

const STATS_BAR = [
  { value: "1,000+", label: "Sets Tracked" },
  { value: "AUD & USD", label: "Dual Pricing" },
  { value: "AI-Powered", label: "Listing Generator" },
  { value: "Free to Use", label: "No Account Needed" },
] as const;

const PROBLEM_POINTS = [
  "No idea if now is the right time to sell",
  "Writing listings takes forever",
  "Prices change and you miss the window",
] as const;

const SOLUTION_POINTS = [
  "Instant SELL or HOLD recommendation",
  "AI listing generated in one click",
  "Portfolio tracked in real time",
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Search",
    description:
      "Enter your set number. BrickValue instantly pulls market data, estimated value and condition-adjusted pricing.",
  },
  {
    step: "02",
    title: "Analyse",
    description:
      "Get a data-backed SELL or HOLD recommendation with confidence score, market context, and timing advice.",
  },
  {
    step: "03",
    title: "List",
    description:
      "Generate a polished eBay or Facebook Marketplace listing in one click. Copy and post — done.",
  },
] as const;

type FeatureItem = {
  icon: string;
  title: string;
  description: string;
  href?: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: "📊",
    title: "Portfolio Tracker",
    description:
      "Track every set with purchase price, condition and intent. See total value and profit in real time.",
  },
  {
    icon: "🤖",
    title: "AI Listing Generator",
    description:
      "Two formats — eBay and Facebook Marketplace. Collector-focused language that converts.",
  },
  {
    icon: "⚠️",
    title: "Retirement Monitor",
    description:
      "Know before the market does. Sets approaching retirement tracked and scored by urgency.",
  },
  {
    icon: "🔥",
    title: "Opportunity Finder",
    description:
      "Every set scored for investment potential. Exceptional, Strong, Watch or Avoid signals.",
  },
  {
    icon: "💱",
    title: "Live eBay Pricing",
    description:
      "Real active listings from eBay AU shown alongside our estimates. AUD and USD.",
  },
  {
    icon: "💰",
    title: "Profit Calculator",
    description:
      "Calculate real net profit after eBay fees, postage and time. Platform comparison included.",
    href: "/profit-calculator",
  },
] as const;

const FOOTER_PRODUCT_LINKS = [
  { href: "/#search", label: "Search" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/retiring-soon", label: "Retiring Soon" },
  { href: "/compare", label: "Compare Sets" },
  { href: "/profit-calculator", label: "Profit Calculator" },
] as const;

const FOOTER_RESOURCE_LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/browse", label: "Browse Sets" },
  { href: "/alerts", label: "Alert Centre" },
  { href: "/growth", label: "Growth Tracker" },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function LandingReveal({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={`landing-reveal ${className}`.trim()}
    >
      {children}
    </section>
  );
}

function LandingNav({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? "border-white/5 bg-[#0d0d0d]/95 backdrop-blur-md"
          : "border-white/5 bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1 sm:px-6"
        aria-label="Landing"
      >
        <Link href="/" aria-label="BrickValue home" className="flex-shrink-0">
          <img
            src="/brickvalue-wordmark.png"
            alt="BrickValue"
            className="flex-shrink-0 object-contain"
            style={{ height: "72px", maxWidth: "340px" }}
          />
        </Link>
        <button
          type="button"
          className="flex-shrink-0 rounded-xl bg-amber-500 px-5 font-bold text-black"
          style={{ height: "44px", fontSize: "15px", whiteSpace: "nowrap" }}
          onClick={openWaitlistInNewTab}
        >
          Join Waitlist
        </button>
      </nav>
    </header>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
          Loading…
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [condition, setCondition] = useState<Condition>("sealed");
  const [sets, setSets] = useState<SetOption[]>([]);
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const searchRef = useRef<SetSearchInputHandle>(null);

  const topRetiringSoon = useMemo(() => {
    return [...getAllRetiringSoonEntries()]
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 3);
  }, []);

  const topOpportunities = useMemo(() => {
    return getAllMarketOpportunities().slice(0, 3);
  }, []);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
      return;
    }
    setOnboardingChecked(true);
  }, [router]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchParams.get("focus") !== "search") return;
    scrollToId("search");
    requestAnimationFrame(() => {
      const input = document.getElementById("setSearch");
      if (input instanceof HTMLInputElement) input.focus();
    });
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/sets")
      .then((res) => res.json())
      .then((data: { sets: SetOption[] }) => setSets(data.sets))
      .catch(() => setError("Could not load set catalogue."));

    Promise.all(
      BROWSE_CATEGORIES.map(async (cat) => {
        const res = await fetch(
          `/api/search?theme=${encodeURIComponent(cat.theme)}`,
        );
        const data = await res.json();
        return { theme: cat.theme, count: (data.results ?? []).length };
      }),
    )
      .then((rows) => {
        const counts: Record<string, number> = {};
        for (const row of rows) counts[row.theme] = row.count;
        setThemeCounts(counts);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await searchRef.current?.submit();
  }

  function handleExampleSet(number: string) {
    setSearchQuery(number);
    setError("");
    scrollToId("search");
    requestAnimationFrame(() => {
      const input = document.getElementById("setSearch");
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    });
  }

  function focusSearch() {
    scrollToId("search");
    requestAnimationFrame(() => {
      const input = document.getElementById("setSearch");
      if (input instanceof HTMLInputElement) input.focus();
    });
  }

  if (!onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0a0a0a] antialiased">
      <LandingNav scrolled={navScrolled} />

      <main className="page-main mx-auto w-full max-w-6xl flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-300 sm:text-sm">
              <span aria-hidden>🧱</span>
              Built for serious LEGO collectors
            </p>

            <h1 className="mt-8 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              Your LEGO collection
              <br />
              <span className="bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent">
                is worth more than you think.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              BrickValue gives you instant market valuations, SELL or HOLD
              recommendations, and AI-powered marketplace listings — so you never
              leave money on the table.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => scrollToId("search")}
                className="touch-target rounded-xl bg-[#f59e0b] px-8 py-3.5 text-center text-sm font-bold text-zinc-900 shadow-lg shadow-amber-500/20 transition hover:bg-[#fbbf24]"
              >
                Analyse Your First Set →
              </button>
              <button
                type="button"
                onClick={() => scrollToId("how-it-works")}
                className="touch-target rounded-xl border border-white/15 bg-white/[0.03] px-8 py-3.5 text-center text-sm font-semibold text-white transition hover:border-[#f59e0b]/40 hover:bg-white/[0.06]"
              >
                See How It Works ↓
              </button>
            </div>

            <p className="mt-8 text-xs text-zinc-500 sm:text-sm">
              Trusted by LEGO collectors across Australia · 1,000+ sets tracked
            </p>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="grid grid-cols-2 divide-x divide-y divide-white/5 sm:grid-cols-4 sm:divide-y-0">
            {STATS_BAR.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center px-4 py-6 text-center"
              >
                <p className="text-lg font-black text-white sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Problem / Solution */}
        <LandingReveal className="border-b border-white/5 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-black text-white sm:text-4xl">
              Stop guessing. Start knowing.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
              <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-red-400/90">
                  The Problem
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">
                  Most collectors leave money on the table
                </h3>
                <ul className="mt-6 space-y-4">
                  {PROBLEM_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-zinc-400 sm:text-base"
                    >
                      <span
                        className="mt-0.5 shrink-0 font-bold text-red-400"
                        aria-hidden
                      >
                        ✕
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
                  The Solution
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">
                  BrickValue does it for you
                </h3>
                <ul className="mt-6 space-y-4">
                  {SOLUTION_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-zinc-300 sm:text-base"
                    >
                      <span
                        className="mt-0.5 shrink-0 font-bold text-emerald-400"
                        aria-hidden
                      >
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </LandingReveal>

        {/* How it works */}
        <LandingReveal
          id="how-it-works"
          className="scroll-mt-24 border-b border-white/5 px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-2xl font-black text-white sm:text-4xl">
              Three steps to smarter selling
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
              From set number to ready-to-post listing in under 60 seconds.
            </p>
          </div>
          <div className="relative mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
            <div
              className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-12 hidden h-px bg-gradient-to-r from-transparent via-[#f59e0b]/30 to-transparent md:block"
              aria-hidden
            />
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:border-[#f59e0b]/25 hover:bg-white/[0.05]"
              >
                <span className="text-4xl font-black text-[#f59e0b]/40">
                  {item.step}
                </span>
                <h3 className="mt-3 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </LandingReveal>

        {/* Features */}
        <LandingReveal
          id="features"
          className="scroll-mt-24 border-b border-white/5 px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-2xl font-black text-white sm:text-4xl">
              Everything a serious collector needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
              Built for investors, resellers and passionate collectors.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const inner = (
                <>
                  <span className="text-3xl" aria-hidden>
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {feature.description}
                  </p>
                </>
              );
              const className =
                "rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-amber-500/30 hover:bg-white/[0.05]";

              if (feature.href) {
                return (
                  <Link key={feature.title} href={feature.href} className={className}>
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={feature.title} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </LandingReveal>

        {/* Retiring soon */}
        {topRetiringSoon.length > 0 && (
          <LandingReveal className="border-b border-white/5 px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-[#fbbf24] sm:text-2xl">
                  ⚠️ Retiring Soon — Act Before Supply Drops
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  These sets are expected to retire within 12 months.
                  Post-retirement values typically rise 30–60%.
                </p>
                <Link
                  href="/retiring-soon"
                  className="mt-2 inline-block text-xs font-semibold text-[#f59e0b] hover:underline"
                >
                  View all retiring sets →
                </Link>
              </div>
              <div className="filter-scroll -mx-1 mt-6 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                {topRetiringSoon.map((entry) => {
                  const tierStyle =
                    entry.tier === "imminent"
                      ? "border-red-500/40 bg-red-950/20"
                      : entry.tier === "soon"
                        ? "border-[#f59e0b]/40 bg-[#f59e0b]/10"
                        : "border-yellow-400/30 bg-yellow-400/5";
                  const tierLabel =
                    entry.tier === "imminent"
                      ? "Imminent"
                      : entry.tier === "soon"
                        ? "Soon"
                        : "Upcoming";
                  return (
                    <Link
                      key={entry.set.number}
                      href={`/results?set=${encodeURIComponent(entry.set.number)}&condition=sealed`}
                      className={`w-[min(85vw,280px)] shrink-0 rounded-2xl border p-4 transition hover:border-[#f59e0b]/60 hover:shadow-lg hover:shadow-amber-500/5 md:w-auto ${tierStyle}`}
                    >
                      <SetImage
                        setNumber={entry.set.number}
                        setName={entry.set.name}
                        variant="home"
                        showSetNumberOnFallback={false}
                      />
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <p className="font-mono text-xs font-bold text-[#f59e0b]">
                          {entry.set.number}
                        </p>
                        <span className="shrink-0 rounded-md bg-zinc-900/80 px-2 py-0.5 text-xs font-bold text-[#f59e0b]">
                          {entry.opportunityScore}/100
                        </span>
                      </div>
                      <p className="mt-1 truncate font-semibold text-white">
                        {entry.set.name}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${RETIRING_TIER_CONFIG[entry.tier].badgeClass}`}
                      >
                        {tierLabel}
                      </span>
                      <p className="mt-3 text-xs font-semibold text-[#f59e0b]">
                        Analyse →
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </LandingReveal>
        )}

        <PersonalizedHomeCard onFocusSearch={focusSearch} />

        {/* Search */}
        <section
          id="search"
          className="scroll-mt-24 border-b border-white/5 px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="relative mx-auto max-w-2xl">
            <div
              className="pointer-events-none absolute -inset-4 rounded-3xl bg-[#f59e0b]/10 blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                Analyse a Set
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Search the catalogue
              </h2>
              <p className="mt-2 text-zinc-400">
                Search by set number or name to get estimated value, list price,
                and a SELL / HOLD recommendation.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-6 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-6"
              >
                <SetSearchInput
                  ref={searchRef}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  condition={condition}
                  onError={setError}
                  onClearError={() => setError("")}
                />
                <p className="mt-2 text-sm text-[#f59e0b]/80">
                  Tip: Retired sets often command 2–3× their original retail
                  price
                </p>

                <div className="mt-4">
                  <p className="text-xs font-medium text-zinc-500">
                    Try an example
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EXAMPLE_SETS.map((ex) => (
                      <button
                        key={ex.number}
                        type="button"
                        onClick={() => handleExampleSet(ex.number)}
                        className="touch-target rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#f59e0b]/50 hover:text-[#fbbf24]"
                      >
                        <span className="font-mono font-bold text-[#f59e0b]">
                          {ex.number}
                        </span>
                        <span className="ml-1.5 text-zinc-500">{ex.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <fieldset className="mt-6">
                  <legend className="mb-3 text-sm font-medium text-zinc-300">
                    Condition
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {CONDITIONS.map((c) => (
                      <label
                        key={c.value}
                        className={`cursor-pointer rounded-xl border px-4 py-4 transition-colors sm:py-3 ${
                          condition === c.value
                            ? "border-[#f2cd00] bg-[#f2cd00]/10 ring-1 ring-[#f2cd00]/50"
                            : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          value={c.value}
                          checked={condition === c.value}
                          onChange={() => setCondition(c.value)}
                          className="sr-only"
                        />
                        <span className="block font-medium text-white">
                          {c.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-zinc-500">
                          {c.hint}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <p className="mt-4 text-sm text-[#f59e0b]" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="touch-target mt-6 w-full rounded-xl bg-[#f2cd00] py-3.5 text-center font-semibold text-zinc-900 transition hover:bg-[#ffe033] focus:outline-none focus:ring-2 focus:ring-[#f2cd00] focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  Analyse
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Top opportunities */}
        {topOpportunities.length > 0 && (
          <LandingReveal className="border-b border-white/5 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#fbbf24]">
                  🔥 Top Opportunities
                </h3>
                <Link
                  href="/opportunities"
                  className="text-xs font-semibold text-[#f59e0b] hover:underline"
                >
                  View all →
                </Link>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Highest-scoring sets for buying or holding right now
              </p>
              <div className="filter-scroll -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                {topOpportunities.map((entry) => (
                  <Link
                    key={entry.set.number}
                    href={`/results?set=${encodeURIComponent(entry.set.number)}&condition=sealed`}
                    className="w-[min(85vw,260px)] shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-[#f59e0b]/50 md:w-auto"
                  >
                    <SetImage
                      setNumber={entry.set.number}
                      setName={entry.set.name}
                      variant="home"
                      showSetNumberOnFallback={false}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-white">
                        {entry.set.name}
                      </p>
                      <span className="shrink-0 text-lg font-bold text-white">
                        {entry.opportunity.opportunityScore}
                      </span>
                    </div>
                    <span
                      className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${buySignalClassName(entry.opportunity.buySignal)}`}
                    >
                      {entry.opportunity.buySignal}
                    </span>
                    <p className="mt-3 text-xs font-semibold text-[#f59e0b]">
                      View →
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </LandingReveal>
        )}

        {/* Browse */}
        <LandingReveal className="border-b border-white/5 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Browse by category
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {BROWSE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.theme}
                  href={`/browse?theme=${encodeURIComponent(cat.theme)}`}
                  className="touch-target inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm transition hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/10"
                >
                  <span className="font-medium text-white">{cat.label}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    ({themeCounts[cat.theme] ?? "…"})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </LandingReveal>

        <div className="px-4 sm:px-6">
          <WaitlistSection
            id="waitlist"
            variant="landing"
            waitlistCountLabel="0+"
          />
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#080808] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="inline-flex">
                <img
                  src="/brickvalue-icon.png"
                  alt="BrickValue"
                  className="h-9 w-9 flex-shrink-0 rounded-xl object-contain"
                />
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                Smart tools for serious LEGO collectors and investors.
              </p>
              <p className="mt-3 text-sm text-zinc-600">
                Built in Melbourne, Australia 🇦🇺
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Product
              </p>
              <ul className="mt-4 space-y-2">
                {FOOTER_PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 transition hover:text-[#f59e0b]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Resources
              </p>
              <ul className="mt-4 space-y-2">
                {FOOTER_RESOURCE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 transition hover:text-[#f59e0b]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Legal &amp; info
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                Pricing data is estimated. Always verify before listing.
              </p>
              <p className="mt-3 text-sm text-zinc-600">
                Not affiliated with the LEGO Group.
              </p>
              <p className="mt-4 text-sm text-zinc-600">© 2026 BrickValue</p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("lego-onboarding-complete");
                  router.push("/onboarding");
                }}
                className="mt-4 text-sm font-medium text-[#f59e0b] transition hover:text-[#fbbf24]"
              >
                Change my goals →
              </button>
              <button
                type="button"
                onClick={openWaitlistInNewTab}
                className="mt-4 block text-sm font-medium text-zinc-500 transition hover:text-[#f59e0b]"
              >
                Join Waitlist →
              </button>
              <p className="mt-6 text-xs text-zinc-600">
                📊 Pricing data manually updated from BrickLink &amp; eBay sold
                listings · Last updated 1 May 2026
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
