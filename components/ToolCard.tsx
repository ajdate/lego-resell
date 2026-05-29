import Link from "next/link";
import type { ToolDefinition } from "@/lib/tools";

type ToolCardProps = {
  tool: ToolDefinition;
  featured?: boolean;
};

export function ToolCard({ tool, featured = false }: ToolCardProps) {
  return (
    <Link
      href={tool.href}
      className={`group relative block rounded-2xl border p-5 transition-all active:scale-95 ${
        featured
          ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
          : "border-white/8 bg-white/[0.03] hover:border-amber-500/30 hover:bg-white/[0.05]"
      }`}
    >
      {featured && (
        <span className="absolute right-3 top-3 rounded-full bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
          Popular
        </span>
      )}
      <span
        className={`absolute text-white/30 transition group-hover:text-white/50 ${
          featured ? "bottom-4 right-4" : "right-4 top-4"
        }`}
      >
        →
      </span>
      <p className={`mb-2 ${featured ? "text-4xl" : "text-3xl"}`}>{tool.icon}</p>
      <p className={`font-bold text-white ${featured ? "text-lg" : "text-base"}`}>
        {tool.name}
      </p>
      <p className="mt-1 text-sm text-white/50">{tool.description}</p>
    </Link>
  );
}
