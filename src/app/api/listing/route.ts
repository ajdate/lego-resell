import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { isCondition } from "@/lib/analyze";

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

  const prompt = `Write a compelling marketplace listing for a LEGO set being sold second-hand.

Set: #${setNumber} ${setName}
Theme: ${theme}
Year: ${year}
Pieces: ${pieces}
Condition: ${condition}
Estimated market value: $${estimatedValue} USD
Recommended list price: $${recommendedListPrice} USD
Seller recommendation: ${recommendation}
Analysis: ${reasoning}

Write a ready-to-paste listing with:
1. A catchy title line (under 80 characters)
2. A detailed description (2-3 short paragraphs) highlighting condition, completeness, and why this set is desirable
3. A bullet list of key specs
4. Shipping/handling note (ships from US, well packed)

Tone: friendly, trustworthy, collector-aware. Do not invent accessories or minifigures not standard to the set. Price the listing at $${recommendedListPrice}.`;

  try {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const listing = textBlock?.type === "text" ? textBlock.text : "";

    if (!listing) {
      return NextResponse.json(
        { error: "No listing text returned from Claude." },
        { status: 502 },
      );
    }

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("Listing generation error:", err);
    console.log("Listing API error details:", {
      message: err instanceof Error ? err.message : String(err),
      cause:
        err instanceof Error && err.cause !== undefined ? err.cause : null,
      stack: err instanceof Error ? err.stack : null,
    });
    return NextResponse.json(
      { error: "Failed to generate listing. Check your API key and try again." },
      { status: 500 },
    );
  }
}
