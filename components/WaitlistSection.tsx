import { openWaitlistInNewTab } from "@/lib/waitlist";

const BENEFITS = [
  "Early access to live BrickLink & eBay pricing",
  "Portfolio alerts and retirement notifications",
  "3 months of Pro free when paid plans launch",
] as const;

const LANDING_INSIGHTS = [
  "Finally know when to sell vs hold",
  "The listing generator saves me 20 mins per set",
  "Wish I had this when I started collecting",
] as const;

type WaitlistSectionProps = {
  variant?: "default" | "landing";
  waitlistCountLabel?: string;
  id?: string;
};

export function WaitlistSection({
  variant = "default",
  waitlistCountLabel = "0+",
  id,
}: WaitlistSectionProps) {
  const isLanding = variant === "landing";

  return (
    <section id={id} className={isLanding ? "py-12 sm:py-16" : "my-8 px-4"}>
      <div
        className={`mx-auto max-w-3xl rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-8 sm:p-10 ${
          isLanding ? "" : ""
        }`}
      >
        {isLanding && (
          <>
            <p className="text-sm font-medium text-[#fbbf24]">
              Join {waitlistCountLabel} collectors locking in free Pro access
            </p>
            <ul className="mt-5 space-y-3 border-b border-white/10 pb-6">
              {LANDING_INSIGHTS.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm italic text-zinc-400"
                >
                  <span className="shrink-0 not-italic text-zinc-600" aria-hidden>
                    “
                  </span>
                  <span>{line}</span>
                  <span className="shrink-0 not-italic text-zinc-600" aria-hidden>
                    ”
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-wider text-zinc-600">
              Collector insights — illustrative
            </p>
          </>
        )}

        <h2
          className={`font-black text-white ${isLanding ? "mt-6 text-2xl sm:text-3xl" : "text-2xl"}`}
        >
          Lock In Free Pro Access
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          BrickValue is free during beta. Early members get 3 months of Pro
          features free when paid plans launch.
        </p>
        <ul className="mt-6 space-y-2.5">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-sm text-zinc-300"
            >
              <span className="shrink-0 text-[#f59e0b]" aria-hidden>
                ✦
              </span>
              {benefit}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={openWaitlistInNewTab}
          className="touch-target mt-8 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-8 py-4 text-sm font-black text-black transition hover:from-[#fbbf24] hover:to-[#f59e0b]"
        >
          Get Early Access →
        </button>
      </div>
    </section>
  );
}
