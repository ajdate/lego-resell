import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init("phc_qxQGktsdCZdEzyCz45vrdFQhaMWPVrUw9G8BEBZ8qNg5", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
}

export { posthog };
