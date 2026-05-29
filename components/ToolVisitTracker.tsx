"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getToolByPath } from "@/lib/tools";
import { recordRecentTool } from "@/lib/recent-tools";

export function ToolVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const tool = getToolByPath(pathname);
    if (tool && tool.id !== "tools") {
      recordRecentTool(tool);
    }
  }, [pathname]);

  return null;
}
