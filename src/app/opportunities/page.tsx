export const dynamic = "force-dynamic";

import setsData from "@/data/sets.json";
import type { LegoSet } from "@/lib/analyze-types";
import type { MarketOpportunityEntry } from "@/lib/market-opportunities";
import { buildMarketOpportunityEntry } from "@/lib/market-opportunities.server";
import OpportunitiesPageClient from "./OpportunitiesPageClient";

function getSetsFromCatalog(raw: typeof setsData): LegoSet[] {
  return Array.isArray(raw)
    ? raw
    : (raw as { sets?: LegoSet[] }).sets || [];
}

export default function OpportunitiesPage() {
  const sets = getSetsFromCatalog(setsData);
  const entries: MarketOpportunityEntry[] = sets
    .map((set) => buildMarketOpportunityEntry(set))
    .filter((entry): entry is MarketOpportunityEntry => entry !== null)
    .sort(
      (a, b) =>
        b.opportunity.opportunityScore - a.opportunity.opportunityScore,
    );

  return <OpportunitiesPageClient initialEntries={entries} />;
}
