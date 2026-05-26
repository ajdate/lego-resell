"use client";

import { INTENT_OPTIONS, type IntentTag } from "@/lib/portfolio-intent";

export function IntentPicker({
  value,
  onChange,
}: {
  value: IntentTag;
  onChange: (tag: IntentTag) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {INTENT_OPTIONS.map((opt) => {
        const selected = value === opt.tag;
        return (
          <button
            key={opt.tag}
            type="button"
            onClick={() => onChange(opt.tag)}
            className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
              selected
                ? `${opt.className} ring-1 ring-white/20`
                : "border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
