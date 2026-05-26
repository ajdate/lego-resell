import { NextRequest, NextResponse } from "next/server";
import { analyzeSet } from "@/lib/analyze";
import {
  buildEbaySalesResponse,
  buildMockSoldListings,
  getEbayAccessToken,
  isEbayConfigured,
  searchEbayMarketListings,
} from "@/lib/ebay-sales";

export async function GET(req: NextRequest) {
  const setNumber = req.nextUrl.searchParams.get("setNumber")?.trim();
  if (!setNumber) {
    return NextResponse.json({ error: "setNumber required" }, { status: 400 });
  }

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

  if (!isEbayConfigured()) {
    const listings =
      !Number.isNaN(estimatedValueAud) && estimatedValueAud > 0
        ? buildMockSoldListings(setNumber, estimatedValueAud)
        : [];

    return NextResponse.json(
      buildEbaySalesResponse(setNumber, listings, {
        configured: false,
        mock: true,
        source: "estimated",
        message:
          "eBay API keys not configured. Showing estimated sold comps — add EBAY_APP_ID and EBAY_CERT_ID to activate live data.",
      }),
      { status: listings.length > 0 ? 200 : 503 },
    );
  }

  try {
    const token = await getEbayAccessToken();
    const browseListings = await searchEbayMarketListings(setNumber, token);

    if (browseListings.length > 0) {
      return NextResponse.json(
        buildEbaySalesResponse(setNumber, browseListings, {
          configured: true,
          mock: false,
          source: "ebay_browse",
          message:
            "Live active listings from eBay AU Browse API. Sold comps via Marketplace Insights planned for V2.",
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
