import { NextRequest, NextResponse } from "next/server";
import { analyzeSet } from "@/lib/analyze";
import {
  buildEbaySalesResponse,
  buildMockSoldListings,
  getEbayAccessToken,
  isEbayConfigured,
  searchEbayMarketListings,
  type EbayRegion,
} from "@/lib/ebay-sales";

function parseRegion(value: string | null): EbayRegion {
  if (value === "US" || value === "UK") return value;
  return "AU";
}

export async function GET(req: NextRequest) {
  const setNumber = req.nextUrl.searchParams.get("setNumber")?.trim();
  if (!setNumber) {
    return NextResponse.json({ error: "setNumber required" }, { status: 400 });
  }

  const region = parseRegion(req.nextUrl.searchParams.get("region"));

  const estimatedParam = req.nextUrl.searchParams.get("estimatedValue");
  let estimatedValueAud = estimatedParam
    ? parseFloat(estimatedParam)
    : NaN;

  if (Number.isNaN(estimatedValueAud)) {
    const analysis = analyzeSet(setNumber, "sealed");
    if (analysis) {
      estimatedValueAud = analysis.estimatedValue;
    }
  }

  const catalogEstimatedValueAud =
    !Number.isNaN(estimatedValueAud) && estimatedValueAud > 0
      ? estimatedValueAud
      : null;

  const responseExtras = { catalogEstimatedValueAud, region };

  if (!isEbayConfigured()) {
    const listings =
      catalogEstimatedValueAud != null
        ? buildMockSoldListings(setNumber, catalogEstimatedValueAud)
        : [];

    return NextResponse.json(
      buildEbaySalesResponse(setNumber, listings, {
        configured: false,
        mock: true,
        source: "estimated",
        message:
          "eBay API keys not configured. Showing estimated sold comps — add EBAY_APP_ID and EBAY_CERT_ID to activate live data.",
        ...responseExtras,
      }),
      { status: listings.length > 0 ? 200 : 503 },
    );
  }

  try {
    const token = await getEbayAccessToken();
    const browseListings = await searchEbayMarketListings(
      setNumber,
      token,
      region,
    );

    if (browseListings.length > 0) {
      return NextResponse.json(
        buildEbaySalesResponse(setNumber, browseListings, {
          configured: true,
          mock: false,
          source: "ebay_browse",
          message:
            "Active listings — sold data available in V2. Results filtered to complete sets ($50–$5,000 AUD).",
          ...responseExtras,
        }),
      );
    }

    if (!Number.isNaN(estimatedValueAud) && estimatedValueAud > 0) {
      return NextResponse.json(
        buildEbaySalesResponse(
          setNumber,
          buildMockSoldListings(setNumber, estimatedValueAud),
          {
            configured: true,
            mock: true,
            source: "estimated",
            message:
              "No eBay listings returned for this query. Showing estimated sold comps.",
            ...responseExtras,
          },
        ),
      );
    }

    return NextResponse.json(
      buildEbaySalesResponse(setNumber, [], {
        configured: true,
        mock: false,
        source: "ebay_browse",
        message: "No eBay listings found for this set.",
        ...responseExtras,
      }),
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "eBay API request failed";

    if (!Number.isNaN(estimatedValueAud) && estimatedValueAud > 0) {
      return NextResponse.json(
        buildEbaySalesResponse(
          setNumber,
          buildMockSoldListings(setNumber, estimatedValueAud),
          {
            configured: true,
            mock: true,
            source: "estimated",
            message: `${message} — showing estimated sold comps.`,
            ...responseExtras,
          },
        ),
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error: message,
        setNumber,
        configured: true,
        mock: true,
      },
      { status: 502 },
    );
  }
}
