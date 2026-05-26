import { openWaitlistInNewTab } from "@/lib/waitlist";

const BENEFITS = [
  "Early access to live BrickLink & eBay pricing",
  "Portfolio alerts and retirement notifications",
  "Founding member pricing when subscriptions launch",
] as const;

export function WaitlistSection() {
  return (
    <section className="my-8 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent p-8">
        <h2 className="text-2xl font-black text-white">Get early access</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Join serious LEGO collectors and investors already on the waitlist. Be
          first to know when premium features launch.
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
          Join the Waitlist →
        </button>
      </div>
    </section>
  );
}
