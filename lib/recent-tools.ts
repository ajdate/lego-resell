import { getToolById, type ToolDefinition } from "@/lib/tools";

export const RECENT_TOOLS_KEY = "lego-recent-tools";

export type RecentToolEntry = {
  id: string;
  name: string;
  href: string;
  icon: string;
  visitedAt: string;
};

export function loadRecentTools(): RecentToolEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentToolEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function recordRecentTool(tool: Pick<ToolDefinition, "id" | "name" | "href" | "icon">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecentTools().filter((entry) => entry.id !== tool.id);
    const next: RecentToolEntry[] = [
      {
        id: tool.id,
        name: tool.name,
        href: tool.href,
        icon: tool.icon,
        visitedAt: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 3);
    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function resolveRecentTools(entries: RecentToolEntry[]): RecentToolEntry[] {
  return entries
    .map((entry) => {
      const tool = getToolById(entry.id);
      if (!tool) return entry;
      return {
        ...entry,
        name: tool.name,
        href: tool.href,
        icon: tool.icon,
      };
    })
    .filter((entry) => entry.id !== "tools");
}
