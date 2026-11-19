export const dynamic = "force-dynamic";

import { getAllMarketOpportunities } from "@/lib/market-opportunities.server";
import OpportunitiesPageClient from "./OpportunitiesPageClient";

export default function OpportunitiesPage() {
  // Only sets with real sales data, highest opportunity score first
  return <OpportunitiesPageClient initialEntries={getAllMarketOpportunities()} />;
}
