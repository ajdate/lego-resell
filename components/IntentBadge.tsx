import { getIntentOption, type IntentTag } from "@/lib/portfolio-intent";

export function IntentBadge({
  tag,
  className = "",
}: {
  tag: IntentTag | undefined;
  className?: string;
}) {
  const option = getIntentOption(tag);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${option.className} ${className}`}
    >
      {option.label}
    </span>
  );
}
