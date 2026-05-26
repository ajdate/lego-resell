import { TALLY_WAITLIST_URL } from "@/lib/waitlist";

export function WaitlistFooterLink({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center ${className}`}>
      <a
        href={TALLY_WAITLIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-white/30 transition-colors hover:text-amber-400"
      >
        Want early access to premium features? Join the waitlist →
      </a>
    </p>
  );
}
