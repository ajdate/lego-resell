"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { initPostHog, posthog } from "@/src/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    initPostHog();
  }, []);

  // Link events to the Clerk account (user ID only, no email)
  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      posthog.identify(user.id, { signed_up_at: user.createdAt?.toISOString() });
      wasSignedIn.current = true;
    } else if (wasSignedIn.current) {
      // Signed out: start a fresh anonymous visitor
      posthog.reset();
      wasSignedIn.current = false;
    }
  }, [user, isLoaded]);

  useEffect(() => {
    posthog.capture("$pageview");
  }, [pathname, searchParams]);

  return <>{children}</>;
}
