import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { isCondition } from "@/lib/analyze";
import {
  isListingFormatsResponse,
  plainListingText,
  type ListingFormatsResponse,
} from "@/lib/listing-formats";

interface ListingRequestBody {
  setNumber: string;
  setName: string;
  theme: string;
  year: number;
  pieces: number;
  condition: string;
  estimatedValue: number;
  recommendedListPrice: number;
  recommendation: string;
  reasoning: string;
  retired?: boolean;
  retiringSoon?: boolean;
}

function conditionLabel(condition: string): string {
  if (condition === "damaged-box") return "Damaged box (sealed contents)";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function retirementNote(retired?: boolean, retiringSoon?: boolean): string {
  if (retired) return "This set is RETIRED (no longer in production).";
  if (retiringSoon) return "This set is RETIRING SOON.";
  return "This set may still be available at retail.";
}

function parseListingJson(raw: string): ListingFormatsResponse | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!isListingFormatsResponse(parsed)) return null;
    const ebay = parsed.ebay;
    const marketplace = parsed.marketplace;
    return {
      ebay: {
        title: plainListingText(ebay.title),
        description: plainListingText(ebay.description),
      },
      marketplace: {
        description: plainListingText(marketplace.description),
      },
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: ListingRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    setNumber,
    setName,
    theme,
    year,
    pieces,
    condition,
    estimatedValue,
    recommendedListPrice,
    recommendation,
    reasoning,
    retired,
    retiringSoon,
  } = body;

  if (
    !setNumber ||
    !setName ||
    !condition ||
    !isCondition(condition) ||
    typeof estimatedValue !== "number" ||
    typeof recommendedListPrice !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid listing parameters." },
      { status: 400 },
    );
  }

  const condLabel = conditionLabel(condition);
  const retirement = retirementNote(retired, retiringSoon);
  const priceAud = recommendedListPrice;
  const valueAud = estimatedValue;

  const prompt = `You write second-hand LEGO resale listings for a seller in Melbourne, Australia. All prices and currency references must be AUD (Australian dollars). Never use USD.

Set: #${setNumber} ${setName}
Theme: ${theme}
Year: ${year}
Pieces: ${pieces}
Condition: ${condLabel}
Estimated market value: $${valueAud} AUD
Recommended asking price: $${priceAud} AUD
Seller recommendation: ${recommendation}
Analysis: ${reasoning}
Status: ${retirement}

CRITICAL FORMAT RULES:
- Do not use any markdown formatting. No headers (no ## or #), no bold (no **), no dividers (no ---), no bullet syntax with asterisks.
- Plain text only. Use line breaks between paragraphs where helpful.
- Location: Melbourne, Victoria, Australia throughout.
- Shipping/pickup line for eBay (include verbatim in the eBay description): "Pickup available from Melbourne VIC or postage at buyer's expense. Tracked shipping only. Well packaged to ensure safe delivery."
- Do not invent accessories or minifigures not standard to the set.

Return ONLY valid JSON (no code fences, no commentary) with this exact structure:
{
  "ebay": {
    "title": "eBay title under 80 characters, professional, includes set number and key hook",
    "description": "Longer eBay listing: professional, detailed, trustworthy tone. Multiple short paragraphs covering condition, completeness, collector/investment appeal if retired, key specs (pieces, year, theme), asking price $${priceAud} AUD, retired status if relevant, and the Melbourne pickup/shipping line above."
  },
  "marketplace": {
    "description": "Facebook Marketplace listing: exactly 3-4 short sentences, friendly, direct, conversational, local Melbourne seller tone. Mention set number and name, condition, retired/collector appeal if relevant, asking $${priceAud} AUD, pickup from Melbourne or postage at buyer's expense. No line breaks required — flowing plain text."
  }
}`;

  try {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    if (!raw) {
      return NextResponse.json(
        { error: "No listing text returned from Claude." },
        { status: 502 },
      );
    }

    const listings = parseListingJson(raw);
    if (!listings) {
      console.error("Listing JSON parse failed. Raw:", raw.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse listing formats from Claude. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(listings);
  } catch (err) {
    console.error("Listing generation error:", err);
    console.log("Listing API error details:", {
      message: err instanceof Error ? err.message : String(err),
      cause:
        err instanceof Error && err.cause !== undefined ? err.cause : null,
      stack: err instanceof Error ? err.stack : null,
    });
    return NextResponse.json(
      {
        error:
          "Failed to generate listing. Check your API key and network, then try again.",
      },
      { status: 500 },
    );
  }
}
